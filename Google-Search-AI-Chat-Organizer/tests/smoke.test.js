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
    return `<div ${r} role="button" tabindex="0"><span>${t}</span></div>`;
  }).join("");
}

function sidebar(kind, titles) {
  return `<main>Основной контент ответа, достаточно длинный чтобы пройти порог индексации.</main>
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

async function boot({ kind, titles, stored = {}, url = "https://www.google.com/search?q=test" }) {
  const dom = new JSDOM(`<!doctype html><body>${sidebar(kind, titles)}</body>`, { url, runScripts: "outside-only", pretendToBeVisual: true });
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

test("rows without any link get title keys; same titles stay separate rows", async () => {
  const titles = ["Бесплатные ИИ", "Бесплатные ИИ", "Сказка о людоеде"];
  const { T } = await boot({ kind: "div", titles });
  const scan = T.scanHistory();
  assert.strictEqual(scan.rows.length, 3);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(scan.rows.map((r) => r.key))), ["t:бесплатные ии", "t:бесплатные ии|2", "t:сказка о людоеде"]);
});

test("explicit thread IDs take precedence over identical q/udm URLs", async () => {
  const { T } = await boot({ kind: "anchor-id", titles: ["Одинаковый запрос", "Одинаковый запрос"] });
  const scan = T.scanHistory();
  assert.strictEqual(scan.rows.length, 2);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(scan.rows.map((r) => r.key))), ["id:thread-0", "id:thread-1"]);
  assert.ok(scan.rows.every((r) => r.hasId && r.hasUrl));
});

test("overlay is laid exactly over Google's Recent box; native list hidden only when complete", async () => {
  const { w, T } = await boot({ kind: "div", titles: ["A чат", "B чат", "C чат"] });
  T.scanForChats();
  const host = T.getHost();
  assert.ok(host && host.isConnected, "host mounted");
  assert.strictEqual(host.style.position, "fixed");
  assert.strictEqual(host.style.left, "8px"); assert.strictEqual(host.style.top, "166px");
  assert.strictEqual(host.style.width, "241px"); assert.strictEqual(host.style.height, "780px");
  assert.strictEqual(T.getNativeHidden(), null, "not hidden before the lazy list is fully loaded");
  await sleep(2600);   // priming: 4 stable steps * 300ms
  T.scanForChats();
  assert.ok(T.getNativeHidden(), "hidden once complete");
  assert.strictEqual(w.document.getElementById("scroller").style.getPropertyValue("visibility"), "hidden");
  T.uiPrefs.open = false; T.scanForChats();
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
  assert.strictEqual(Object.keys(T.state.chats).length, 60);
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

test("stale entries are retained and marked missing after a complete scan", async () => {
  const old = Date.now() - 3600e3;
  const stored = {
    google_ai_chats: {
      "t:живой": { title: "Живой", updatedAt: old },
      "t:мёртвый": { title: "Мёртвый", updatedAt: old },
      "t:в папке": { title: "В папке", updatedAt: old }
    },
    google_ai_folders: [{ id: "f1", name: "ГД", color: "#4285F4", children: [], chat_urls: ["t:в папке"] }]
  };
  const { T } = await boot({ kind: "div", titles: ["Живой", "Новый"], stored });
  await sleep(2700); T.scanForChats();
  assert.ok(T.state.chats["t:живой"]); assert.ok(T.state.chats["t:новый"]);
  assert.ok(T.state.chats["t:мёртвый"] && T.state.chats["t:мёртвый"].missing, "unassigned old record retained as missing");
  assert.ok(T.state.chats["t:в папке"] && T.state.chats["t:в папке"].missing, "assigned old record retained as missing");
});

test("renamed key keeps folder membership (re-bind by title)", async () => {
  const old = Date.now() - 3600e3;
  const stored = {
    google_ai_chats: { "https://www.google.com/search?q=a&udm=50": { title: "Чат А", text: "индекс ".repeat(10), updatedAt: old } },
    google_ai_folders: [{ id: "f1", name: "ГД", color: "#4285F4", children: [], chat_urls: ["https://www.google.com/search?q=a&udm=50"] }]
  };
  const { T } = await boot({ kind: "div", titles: ["Чат А"], stored });
  T.scanForChats();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(T.state.folders[0].chat_urls)), ["t:чат а"]);
  assert.ok(T.state.chats["t:чат а"].text.startsWith("индекс"), "indexed text preserved");
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
  assert.ok(T.state.chats["t:общий заголовок"], "new ambiguous row gets its own record");
  assert.ok(T.state.chats["id:thread-old-a"].text.includes("старого чата A"));
  assert.ok(T.state.chats["id:thread-old-b"].text.includes("старого чата B"));
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(T.state.folders[0].chat_urls)),
    ["id:thread-old-b"],
    "existing folder assignment remains attached to its original record"
  );
});

test("clicking an organizer row proxies the click to the native row", async () => {
  const { w, T } = await boot({ kind: "div", titles: ["Первый чат", "Второй чат"] });
  let clicked = 0;
  w.document.querySelectorAll("#scroller [role=button]")[2].addEventListener("click", () => { clicked += 1; });
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

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log("  ok   " + name); }
    catch (e) { failed += 1; console.log("  FAIL " + name + "\n       " + (e.stack || e).toString().split("\n").slice(0, 4).join("\n       ")); }
  }
  console.log(failed ? failed + " failed" : "all " + tests.length + " passed");
  process.exit(failed ? 1 : 0);
})();
