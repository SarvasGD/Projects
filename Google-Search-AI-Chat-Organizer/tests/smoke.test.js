// Smoke tests for content.js against synthetic sidebars (jsdom has no layout, so
// geometry/scroll sizes are provided through data-* attributes and patched getters).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const CODE = fs.readFileSync(process.argv[2] || path.join(__dirname, "../content.js"), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PATCH = `
  Element.prototype.getBoundingClientRect = function () {
    const v = (this.getAttribute && this.getAttribute("data-rect") || "0,0,0,0").split(",").map(Number);
    return { left: v[0], top: v[1], width: v[2], height: v[3], right: v[0] + v[2], bottom: v[1] + v[3], x: v[0], y: v[1] };
  };
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", { get() { return Number(this.getAttribute("data-sh") || 0); }, configurable: true });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { get() { return Number(this.getAttribute("data-ch") || 0); }, configurable: true });
`;

function rows(kind, titles, y0 = 254) {
  return titles.map((t, i) => {
    const r = `data-rect="8,${y0 + i * 40},241,40"`;
    if (kind === "anchor") return `<a ${r} href="/search?udm=50&mtid=ID${i}&ei=rnd${Math.random()}&ved=x"><span>chat_bubble</span><span>${t}</span></a>`;
    if (kind === "anchor-id") return `<a ${r} data-session-thread-id="thread-${i}" href="/search?q=shared&udm=50"><span>${t}</span></a>`;
    if (kind === "anchor-query") return `<a ${r} href="/search?q=query-${i}&udm=50"><span>${t}</span></a>`;
    return `<div ${r} role="button" tabindex="0"><span>${t}</span></div>`;
  }).join("");
}

function sidebar(kind, titles, conversationHTML = "") {
  return `<main>${conversationHTML || "Основной контент ответа, достаточно длинный чтобы пройти порог индексации."}</main>
  <nav data-rect="0,0,261,995">
    <a data-rect="-9999,0,1,1" href="/search?q=x&udm=50#settings">Skip to settings</a>
    <a data-rect="8,64,241,40" href="/">Новый чат</a>
    <div role="button" data-rect="8,110,241,40">Поиск цепочек</div>
    <div id="scroller" style="overflow-y:auto" data-rect="8,166,241,780" data-sh="8572" data-ch="780">
      <div data-rect="8,166,241,8572">
        <button role="button" data-rect="9,166,240,40">Недавнее</button>
        ${rows(kind, titles, 214)}
      </div>
    </div>
    <div role="button" data-rect="8,950,241,40">Настройки</div>
  </nav>`;
}

async function boot({ kind, titles, stored = {}, url = "https://www.google.com/search?q=test&udm=50", conversationHTML = "" }) {
  const dom = new JSDOM(`<!doctype html><body>${sidebar(kind, titles, conversationHTML)}</body>`, { url, runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  const saved = Object.assign({}, stored);
  w.chrome = { runtime: {}, storage: { local: {
    get: (keys, cb) => { const o = {}; [].concat(keys).forEach((k) => { if (k in saved) o[k] = JSON.parse(JSON.stringify(saved[k])); }); cb(o); },
    set: (v, cb) => { Object.assign(saved, JSON.parse(JSON.stringify(v))); cb && cb(); }
  } } };
  w.eval(PATCH);
  w.__GSACO_TEST__ = {};
  w.eval(CODE);
  await w.__GSACO_TEST__.loaded;
  return { w, T: w.__GSACO_TEST__, saved };
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("rows without q-parameter links are detected, skip-links and nav are not", async () => {
  const titles = ["Табличный топ решений", "Артур Конан Дойл", "Табличный топ решений", "Ноотропы"];
  const { T } = await boot({ kind: "anchor", titles });
  const scan = T.scanHistory();
  assert.strictEqual(scan.rows.length, 4);
  assert.ok(scan.rows.every((r) => r.hasUrl), "keys come from thread-id parameter");
  assert.strictEqual(new Set(scan.rows.map((r) => r.key)).size, 4, "all keys unique");
  assert.ok(!Object.values(T.state.chats).some((c) => /skip to|настройки|новый чат/i.test(c.title)));
  assert.ok(scan.rows[0].title === "Табличный топ решений", "icon ligature line is dropped from title");
});

test("rows without stable IDs or thread URLs stay unclassified and are not saved as chats", async () => {
  const titles = ["Бесплатные ИИ", "Бесплатные ИИ", "Сказка о людоеде"];
  const { T } = await boot({ kind: "div", titles });
  const scan = T.scanHistory();
  assert.strictEqual(scan.rows.length, 3);
  assert.ok(scan.rows.every((row) => row.key === null));
  assert.strictEqual(scan.unclassifiedRows.length, 3);
  assert.ok(!Object.keys(T.state.chats).some((key) => key.startsWith("t:")));
  assert.strictEqual(T.getHost().shadowRoot.querySelectorAll(".folder.unclassified").length, 1);
});

test("unknown-only history keeps Google's native list visible", async () => {
  const { w, T } = await boot({ kind: "div", titles: ["Одиночный AI-запрос"] });
  const host = T.getHost();
  assert.ok(host && host.isConnected);
  assert.strictEqual(T.getNativeHidden(), null);
  assert.strictEqual(w.document.getElementById("scroller").style.visibility, "");
  assert.strictEqual(host.shadowRoot.querySelector(".panel").hidden, true);
  assert.strictEqual(host.shadowRoot.querySelector(".bar").hidden, false);
});

test("chat rows expose Markdown export only", async () => {
  const { T } = await boot({ kind: "anchor", titles: ["Чат для экспорта"] });
  const buttons = [...T.getHost().shadowRoot.querySelectorAll(".chat-row .export-button")];
  assert.deepStrictEqual(buttons.map((button) => button.textContent), ["MD"]);
});

test("explicit thread IDs take precedence over identical q/udm URLs", async () => {
  const { T } = await boot({ kind: "anchor-id", titles: ["Одинаковый запрос", "Одинаковый запрос"] });
  const scan = T.scanHistory();
  assert.strictEqual(scan.rows.length, 2);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(scan.rows.map((r) => r.key))), ["id:thread-0", "id:thread-1"]);
  assert.ok(scan.rows.every((r) => r.hasId && !r.hasUrl));
});

test("overlay waits for full loading, then covers the native history and restores it when collapsed", async () => {
  const { w, T } = await boot({ kind: "anchor", titles: ["A чат", "B чат", "C чат"] });
  T.scanForChats();
  const host = T.getHost();
  assert.ok(host && host.isConnected, "host mounted");
  assert.strictEqual(host.style.position, "fixed");
  assert.strictEqual(host.style.left, "8px");
  assert.strictEqual(host.style.width, "241px");
  assert.strictEqual(T.getNativeHidden(), null, "native list remains visible while lazy loading");
  assert.strictEqual(host.style.height, "34px", "organizer stays collapsed while the list is incomplete");

  await sleep(2600); // priming: 4 stable steps * 300ms
  T.scanForChats();
  assert.strictEqual(host.style.top, "166px");
  assert.strictEqual(host.style.height, "780px");
  assert.ok(T.getNativeHidden(), "native history is hidden after complete loading with stable identities");
  assert.strictEqual(w.document.getElementById("scroller").style.getPropertyValue("visibility"), "hidden");

  T.uiPrefs.open = false;
  T.scanForChats();
  assert.strictEqual(w.document.getElementById("scroller").style.getPropertyValue("visibility"), "", "native list restored when collapsed");
});

test("priming loads lazy rows and the organizer lists all of them", async () => {
  const { w, T } = await boot({ kind: "div", titles: Array.from({ length: 5 }, (_, i) => "Чат номер " + i) });
  const sc = w.document.getElementById("scroller");
  const inner = sc.firstElementChild;
  let added = false;
  Object.defineProperty(sc, "scrollTop", { get() { return 0; }, set() {
    if (added) return; added = true;
    for (let i = 5; i < 60; i++) inner.insertAdjacentHTML("beforeend", `<div data-rect="8,${214 + i * 40},241,40" role="button" tabindex="0"><span>Чат номер ${i}</span></div>`);
  }, configurable: true });
  T.scanForChats();
  await sleep(2600);
  T.scanForChats();
  assert.strictEqual(T.scanHistory().unclassifiedRows.length, 60);
  assert.strictEqual(Object.keys(T.state.chats).filter(T.isVerifiedChatKey).length, 0);
});

test("migration preserves colliding old URLs and keeps folder assignment mapped", async () => {
  const urlA = "https://www.google.com/search?q=%D0%A2%D0%BE%D0%BF&udm=50&ei=one&ved=one";
  const urlB = "https://www.google.com/search?q=%D0%A2%D0%BE%D0%BF&udm=50&ei=two&ved=two";
  const chats = {
    [urlA]: { title: "Табличный топ решений", text: "индекс А ".repeat(8), updatedAt: 10 },
    [urlB]: { title: "Табличный топ решений", text: "индекс Б ".repeat(8), updatedAt: 20 },
    "https://www.google.com/search?q=z&udm=50": { title: "Skip to settings", text: "", updatedAt: 1 },
    "https://www.google.com/search?q=z2&udm=50": { title: "Перейти к настройкам", text: "", updatedAt: 1 }
  };
  const stored = {
    google_ai_chats: chats,
    google_ai_folders: [{ id: "f1", name: "ГД", color: "#4285F4", children: [], chat_urls: [urlB] }]
  };
  const { T } = await boot({ kind: "div", titles: ["Другой чат"], stored });
  const matching = Object.keys(T.state.chats).filter((key) => T.state.chats[key].title === "Табличный топ решений");
  assert.strictEqual(matching.length, 2, "same canonical URL collisions are preserved");
  assert.ok(matching.includes(T.state.folders[0].chat_urls[0]), "folder points to the correct migrated record");
  assert.ok(!Object.values(T.state.chats).some((item) => /skip|перейти/i.test(item.title)));
});

test("legacy title-only records are retained locally but excluded from active chats", async () => {
  const stored = {
    google_ai_chats: {
      "t:живой": { title: "Живой", updatedAt: 10 },
      "t:мёртвый": { title: "Мёртвый", updatedAt: 20 },
      "t:в папке": { title: "В папке", updatedAt: 30 }
    },
    google_ai_folders: [{ id: "f1", name: "ГД", color: "#4285F4", children: [], chat_urls: ["t:в папке"] }]
  };
  const { T } = await boot({ kind: "div", titles: ["Живой", "Новый"], stored });
  assert.ok(T.state.chats["t:живой"] && T.state.chats["t:мёртвый"] && T.state.chats["t:в папке"]);
  assert.strictEqual(T.getHost().shadowRoot.querySelector(".folder.unassigned .folder-count").textContent, "0");
  assert.strictEqual(T.scanHistory().unclassifiedRows.length, 2);
});

test("a stable thread identity preserves folder and index after a title change", async () => {
  const stableUrl = "https://www.google.com/search?udm=50&mtid=ID0";
  const stored = {
    google_ai_chats: { [stableUrl]: { title: "Старое название", text: "индекс ".repeat(10), updatedAt: 100 } },
    google_ai_folders: [{ id: "f1", name: "ГД", color: "#4285F4", children: [], chat_urls: [stableUrl] }]
  };
  const { T } = await boot({ kind: "anchor", titles: ["Новое название"], stored });
  T.scanForChats();
  const key = T.toThreadKey(stableUrl);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(T.state.folders[0].chat_urls)), [key]);
  assert.strictEqual(T.state.chats[key].title, "Новое название");
  assert.ok(T.state.chats[key].text.startsWith("индекс"), "indexed text preserved");
});

test("ambiguous title does not steal an old chat's index or folder", async () => {
  const stored = {
    google_ai_chats: {
      "id:thread-old-a": { title: "Общий заголовок", text: "Индекс старого чата A ".repeat(5), updatedAt: 100 },
      "id:thread-old-b": { title: "Общий заголовок", text: "Индекс старого чата B ".repeat(5), updatedAt: 200 }
    },
    google_ai_folders: [
      { id: "f1", name: "Сохранённая папка", color: "#4285F4", children: [], chat_urls: ["id:thread-old-b"] }
    ]
  };
  const { T } = await boot({ kind: "div", titles: ["Общий заголовок"], stored });
  assert.ok(T.state.chats["id:thread-old-a"]);
  assert.ok(T.state.chats["id:thread-old-b"]);
  assert.ok(!T.state.chats["t:общий заголовок"], "ambiguous title is not persisted as a chat");
  assert.ok(T.state.chats["id:thread-old-a"].text.includes("старого чата A"));
  assert.ok(T.state.chats["id:thread-old-b"].text.includes("старого чата B"));
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(T.state.folders[0].chat_urls)),
    ["id:thread-old-b"],
    "existing folder assignment remains attached to its original record"
  );
});

test("clicking an organizer row proxies the click to the native row", async () => {
  const { w, T } = await boot({ kind: "anchor", titles: ["Первый чат", "Второй чат"] });
  let clicked = 0;
  w.document.querySelectorAll("#scroller a[href]")[1].addEventListener("click", (event) => { event.preventDefault(); clicked += 1; });
  T.scanForChats();
  const link = [...T.getHost().shadowRoot.querySelectorAll(".chat-link")].find((a) => a.textContent === "Второй чат");
  assert.ok(link, "row rendered in organizer");
  link.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
  assert.strictEqual(clicked, 1);
});

test("organizer is removed (and native list restored) after the sidebar disappears", async () => {
  const { w, T } = await boot({ kind: "div", titles: ["A чат"] });
  T.scanForChats();
  assert.ok(T.getHost());
  w.document.querySelector("nav").remove();
  T.scanForChats(); T.scanForChats(); T.scanForChats();
  assert.strictEqual(T.getHost(), null);
});

test("toKey ignores volatile params and keeps identity params", async () => {
  const { T } = await boot({ kind: "div", titles: ["x чат"] });
  assert.strictEqual(T.toKey("https://www.google.com/search?q=a&udm=50&ei=1&ved=2&mstk=3"), T.toKey("https://www.google.com/search?ved=9&udm=50&q=a&aep=11"));
  assert.notStrictEqual(T.toKey("https://www.google.com/search?q=a&udm=50&mtid=1"), T.toKey("https://www.google.com/search?q=a&udm=50&mtid=2"));
  assert.strictEqual(T.toKey("https://evil.com/search?q=a"), null);
});

test("DOM snapshot is anonymised and describes rows", async () => {
  const { T } = await boot({ kind: "anchor", titles: ["Секретное название чата", "Другой чат"] });
  const snap = T.buildSnapshot(T.scanHistory());
  assert.ok(/Строка 1: a /.test(snap) && /params=udm,mtid,ei,ved/.test(snap), snap);
  assert.ok(!/Секретное|ID0|rnd/.test(snap), "no titles or query values leak into the snapshot");
});


test("ordinary Google Search does not mount the organizer or save a chat", async () => {
  const { T } = await boot({ kind: "anchor", titles: ["Обычный запрос"], url: "https://www.google.com/search?q=ordinary" });
  assert.strictEqual(T.isCurrentAiPage(), false);
  assert.strictEqual(T.getHost(), null);
  assert.strictEqual(Object.keys(T.state.chats).length, 0);
});

test("thread identity rejects q/udm-only URLs and accepts a stable thread parameter", async () => {
  const { T } = await boot({ kind: "div", titles: ["Обычный запрос"] });
  assert.strictEqual(T.toThreadKey("https://www.google.com/search?q=x&udm=50"), null);
  assert.ok(T.toThreadKey("https://www.google.com/search?q=x&udm=50&mtid=thread-x"));
});


test("thread identity is stable when Google changes the query text", async () => {
  const { T } = await boot({ kind: "div", titles: ["Обычный запрос"] });
  const first = T.toThreadKey("https://www.google.com/search?q=first&udm=50&mtid=stable-123");
  const second = T.toThreadKey("https://www.google.com/search?q=follow-up&udm=50&mtid=stable-123");
  assert.strictEqual(first, second);
  assert.notStrictEqual(first, T.toThreadKey("https://www.google.com/search?q=first&udm=50&mtid=stable-456"));
});

test("conversation inspector counts user role markers and excludes assistant replies", async () => {
  const conversationHTML = [
    '<div data-message-author-role="user"><p>PRIVATE USER TEXT A</p></div>',
    '<div data-message-author-role="assistant"><p>PRIVATE ASSISTANT TEXT A</p></div>',
    '<div data-message-author-role="user"><p>PRIVATE USER TEXT B</p></div>',
    '<div data-message-author-role="assistant"><p>PRIVATE ASSISTANT TEXT B</p></div>'
  ].join("");
  const { T } = await boot({ kind: "anchor", titles: ["Тестовый диалог"], conversationHTML });
  const inspected = T.inspectConversationMessages();
  assert.strictEqual(inspected.userTurns, 2);
  assert.strictEqual(inspected.assistantMessages.length, 2);
  const snap = T.buildSnapshot(T.scanHistory());
  assert.ok(snap.includes("реплики пользователя по явным role markers: 2"));
  assert.ok(!/PRIVATE USER TEXT|PRIVATE ASSISTANT TEXT/.test(snap), "snapshot does not include message text");
});

test("complete verified Google history automatically removes deleted stable chats and folder bindings", async () => {
  const removed = "https://www.google.com/search?udm=50&mtid=OLD";
  const stored = {
    google_ai_chats: { [removed]: { title: "Удалённый чат", text: "old index", updatedAt: 1 } },
    google_ai_folders: [{ id: "f1", name: "Folder", color: "#4285F4", children: [], chat_urls: [removed] }]
  };
  const { T } = await boot({ kind: "anchor", titles: ["Оставшийся чат"], stored });
  await sleep(2700);
  T.scanForChats();
  const scan = T.scanHistory();
  assert.ok(scan.complete && scan.identityComplete);
  assert.strictEqual(T.state.chats[T.toThreadKey(removed)], undefined);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(T.state.folders[0].chat_urls)), []);
});

test("unclassified rows prevent destructive synchronization", async () => {
  const oldKey = "id:thread-old";
  const stored = {
    google_ai_chats: { [oldKey]: { title: "Сохранённый", text: "preserve me", updatedAt: 1 } },
    google_ai_folders: [{ id: "f1", name: "Folder", color: "#4285F4", children: [], chat_urls: [oldKey] }]
  };
  const { T } = await boot({ kind: "div", titles: ["Неизвестная строка"], stored });
  await sleep(2700);
  T.scanForChats();
  const scan = T.scanHistory();
  assert.ok(scan.complete);
  assert.strictEqual(scan.identityComplete, false);
  assert.ok(T.state.chats[oldKey], "old chat remains during ambiguous scan");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(T.state.folders[0].chat_urls)), [oldKey]);
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log("  ok   " + name); }
    catch (e) { failed += 1; console.log("  FAIL " + name + "\n       " + (e.stack || e).toString().split("\n").slice(0, 4).join("\n       ")); }
  }
  console.log(failed ? failed + " failed" : "all " + tests.length + " passed");
  process.exit(failed ? 1 : 0);
})();
