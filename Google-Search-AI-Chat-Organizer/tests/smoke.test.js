// DOM fixtures for Google AI Mode thread identity, user-turn counting and data safety.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const CODE = fs.readFileSync(process.argv[2] || path.join(__dirname, "../content.js"), "utf8");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PATCH = [
  'Element.prototype.getBoundingClientRect = function () {',
  ' const a = (this.getAttribute && this.getAttribute("data-rect") || "0,0,0,0").split(",").map(Number);',
  ' return { left:a[0], top:a[1], width:a[2], height:a[3], right:a[0]+a[2], bottom:a[1]+a[3], x:a[0], y:a[1] };',
  '};',
  'Object.defineProperty(HTMLElement.prototype, "scrollHeight", { get() { return Number(this.getAttribute("data-sh") || 0); }, configurable:true });',
  'Object.defineProperty(HTMLElement.prototype, "clientHeight", { get() { return Number(this.getAttribute("data-ch") || 0); }, configurable:true });'
].join("\n");

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
}
function makeRows(kind, titles, y0 = 214) {
  return titles.map((title, i) => {
    const rect = 'data-rect="8,' + (y0 + i * 40) + ',241,40"';
    const text = esc(title);
    if (kind === "thread") return "<button " + rect + ' data-thread-id="thread-' + i + '"><span>' + text + "</span></button>";
    if (kind === "session") return "<button " + rect + ' data-session-thread-id="session-' + i + '"><span>' + text + "</span></button>";
    if (kind === "hash") return '<a ' + rect + ' href="/search?udm=50#thread=hash-' + i + '">' + text + "</a>";
    if (kind === "mtid") return '<a ' + rect + ' href="/search?q=x&udm=50&mtid=mtid-' + i + '">' + text + "</a>";
    if (kind === "q") return '<a ' + rect + ' href="/search?q=' + encodeURIComponent(title) + '&udm=50">' + text + "</a>";
    return "<div " + rect + ' role="button" tabindex="0">' + text + "</div>";
  }).join("");
}
function pageHtml(kind, titles) {
  return '<main data-rect="300,80,900,700">Google AI Mode content</main><nav data-rect="0,0,261,995">' +
    '<a data-rect="-9999,0,1,1" href="/search?q=x&udm=50#settings">Skip to settings</a>' +
    '<a data-rect="8,64,241,40" href="/">Новый чат</a>' +
    '<div role="button" data-rect="8,110,241,40">Поиск цепочек</div>' +
    '<div id="scroller" style="overflow-y:auto" data-rect="8,166,241,780" data-sh="8572" data-ch="780">' +
    '<div id="history-inner" data-rect="8,166,241,8572"><button role="button" data-rect="9,166,240,40">Недавнее</button>' +
    makeRows(kind, titles) + "</div></div></nav>";
}
async function boot(opts = {}) {
  const kind = opts.kind || "thread";
  const titles = opts.titles || [];
  const saved = structuredClone(opts.stored || {});
  const dom = new JSDOM("<!doctype html><body>" + pageHtml(kind, titles) + "</body>", {
    url: opts.url || "https://www.google.com/search?udm=50&q=test",
    runScripts: "outside-only", pretendToBeVisual: true
  });
  const w = dom.window;
  w.chrome = { runtime:{}, storage:{ local:{
    get:(keys,cb)=>{ const o={}; [].concat(keys).forEach(k=>{if(k in saved)o[k]=structuredClone(saved[k]);}); cb(o); },
    set:(v,cb)=>{Object.assign(saved,structuredClone(v)); if(cb)cb();}
  } } };
  w.eval(PATCH);
  w.__GSACO_TEST__ = {};
  w.eval(CODE);
  await w.__GSACO_TEST__.loaded;
  return { w, T:w.__GSACO_TEST__, saved };
}
const tests=[];
function test(name, fn){tests.push([name,fn]);}

test("imports rows by explicit thread ID", async()=>{
  const {T}=await boot({titles:["Первый","Второй"]});
  assert.deepEqual(Array.from(T.scanHistory().rows, r => r.key),["id:thread-0","id:thread-1"]);
  assert.equal(Object.keys(T.state.chats).filter(T.isStableChatKey).length,2);
});
test("supports session ID, mtid and hash thread URLs", async()=>{
  assert.equal((await boot({kind:"session",titles:["Session record"]})).T.scanHistory().rows[0].key,"id:session-0");
  assert.equal((await boot({kind:"mtid",titles:["Mtid record"]})).T.scanHistory().rows[0].key,"id:mtid-0");
  assert.equal((await boot({kind:"hash",titles:["Hash record"]})).T.scanHistory().rows[0].key,"id:hash-0");
});
test("q plus udm and generic clickable rows are never treated as conversations", async()=>{
  for (const kind of ["q","div"]) {
    const {T}=await boot({kind,titles:["Одиночный запрос","Ещё один запрос"]});
    assert.equal(T.scanHistory().rows.length,0);
    assert.equal(Object.keys(T.state.chats).filter(T.isStableChatKey).length,0);
    assert.equal(T.getNativeHidden(),null);
  }
});
test("counts explicit user message roles and excludes assistant messages", async()=>{
  const {w,T}=await boot();
  w.document.querySelector("main").innerHTML=[
    '<div data-message-author-role="user">U1</div>',
    '<div data-message-author-role="assistant">A1</div>',
    '<div data-message-author-role="user">U2</div>',
    '<div data-message-author-role="assistant">A2</div>'
  ].join("");
  const result=T.countUserTurns(w.document.querySelector("main")); assert.equal(result.count,2); assert.equal(result.source,"dom-role");
});
test("counts You said markers and does not count AI replies", async()=>{
  const {w,T}=await boot();
  w.document.querySelector("main").textContent=[
    "AI Mode Conversation:","You said: first","AI Mode reply for first","answer",
    "You said: second","AI Mode reply for second","answer"
  ].join("\n");
  const result=T.countUserTurns(w.document.querySelector("main")); assert.equal(result.count,2); assert.equal(result.source,"conversation-markers");
});
test("one-turn, multi-turn and unknown states are distinct", async()=>{
  const {w,T}=await boot();
  const main=w.document.querySelector("main");
  main.textContent="AI Mode Conversation:\nYou said: one\nAI Mode reply for one\nanswer";
  assert.equal(T.countUserTurns(main).count,1);
  main.textContent="AI Mode Conversation:\nYou said: one\nAI Mode reply for one\nanswer\nYou said: two\nAI Mode reply for two\nanswer";
  assert.equal(T.countUserTurns(main).count,2);
  main.textContent="Query and answer with no conversation markers";
  assert.equal(T.countUserTurns(main).count,null);
});
test("message-count filter separates one, multi and unknown",async()=>{
  const {T}=await boot({titles:["Single","Multi","Unknown"]});
  T.state.chats["id:thread-0"].userMessageCount=1;
  T.state.chats["id:thread-1"].userMessageCount=3;
  T.state.chats["id:thread-2"].userMessageCount=null;
  T.uiPrefs.messageFilter="single"; T.render();
  assert.deepEqual([...T.getHost().shadowRoot.querySelectorAll(".chat-link")].map(n=>n.textContent),["Single"]);
  T.uiPrefs.messageFilter="multi"; T.render();
  assert.deepEqual([...T.getHost().shadowRoot.querySelectorAll(".chat-link")].map(n=>n.textContent),["Multi"]);
  T.uiPrefs.messageFilter="unknown"; T.render();
  assert.deepEqual([...T.getHost().shadowRoot.querySelectorAll(".chat-link")].map(n=>n.textContent),["Unknown"]);
});
test("filter control persists selection",async()=>{
  const {w,T,saved}=await boot({titles:["One"]});
  const control=T.getHost().shadowRoot.querySelector("select[aria-label='Фильтр по количеству реплик пользователя']");
  assert.ok(control);
  control.value="multi";
  control.dispatchEvent(new w.Event("change",{bubbles:true}));
  await sleep(0);
  assert.equal(saved.google_ai_ui.messageFilter,"multi");
});
test("overlay hides native history only after full stable-ID scan",async()=>{
  const {w,T}=await boot({titles:["One","Two"]});
  T.scanForChats();
  assert.equal(T.getNativeHidden(),null);
  await sleep(2600);
  T.scanForChats();
  assert.ok(T.getNativeHidden());
  assert.equal(w.document.getElementById("scroller").style.getPropertyValue("visibility"),"hidden");
  T.uiPrefs.open=false; T.scanForChats();
  assert.equal(w.document.getElementById("scroller").style.getPropertyValue("visibility"),"");
});
test("lazy loading discovers newly appended stable-ID rows",async()=>{
  const {w,T}=await boot({titles:["Chat 0","Chat 1"]});
  const scroller=w.document.getElementById("scroller");
  const inner=w.document.getElementById("history-inner");
  let inserted=false;
  Object.defineProperty(scroller,"scrollTop",{get(){return 0;},set(){
    if(inserted)return; inserted=true;
    for(let i=2;i<15;i++) inner.insertAdjacentHTML("beforeend",
      '<button data-thread-id="thread-'+i+'" data-rect="8,'+(214+i*40)+',241,40">Chat '+i+"</button>");
  },configurable:true});
  T.scanForChats(); await sleep(2600); T.scanForChats();
  assert.equal(T.scanHistory().rows.length,15);
});
test("legacy title-only data is retained but hidden from the organizer",async()=>{
  const stored={
    google_ai_chats:{"t:old search":{title:"Old search",text:"Keep this indexed text",updatedAt:1}},
    google_ai_folders:[{id:"f",name:"Legacy",color:"#4285F4",children:[],chat_urls:["t:old search"]}]
  };
  const {T}=await boot({titles:["Stable chat"],stored});
  T.render();
  assert.ok(T.state.chats["t:old search"]);
  assert.equal(T.state.chats["t:old search"].text,"Keep this indexed text");
  assert.equal([...T.getHost().shadowRoot.querySelectorAll(".chat-link")].some(n=>n.textContent==="Old search"),false);
});
test("migration maps legacy URL to matching stable ID and preserves folder/index",async()=>{
  const oldUrl="https://www.google.com/search?q=shared&udm=50&mtid=thread-0&ei=one";
  const stored={
    google_ai_chats:{[oldUrl]:{title:"Old title",text:"Indexed content",updatedAt:1,url:oldUrl,threadId:"thread-0"}},
    google_ai_folders:[{id:"f",name:"Work",color:"#4285F4",children:[],chat_urls:[oldUrl]}]
  };
  const {T}=await boot({titles:["Renamed title"],stored});
  assert.ok(T.state.chats["id:thread-0"]);
  assert.equal(T.state.chats["id:thread-0"].text,"Indexed content");
  assert.deepEqual(Array.from(T.state.folders[0].chat_urls),["id:thread-0"]);
});
test("same title never rebinds legacy data to a new thread",async()=>{
  const stored={
    google_ai_chats:{"t:same title":{title:"Same title",text:"Legacy index",updatedAt:1}},
    google_ai_folders:[{id:"f",name:"Legacy",color:"#4285F4",children:[],chat_urls:["t:same title"]}]
  };
  const {T}=await boot({titles:["Same title"],stored});
  assert.ok(T.state.chats["t:same title"]);
  assert.ok(T.state.chats["id:thread-0"]);
  assert.equal(T.state.chats["id:thread-0"].text,"");
  assert.deepEqual(Array.from(T.state.folders[0].chat_urls),["t:same title"]);
});
test("organizer click proxies to exact native row by ID",async()=>{
  const {w,T}=await boot({titles:["First chat","Second chat"]});
  let first=0,second=0;
  const native=w.document.querySelectorAll("#history-inner button[data-thread-id]");
  native[0].addEventListener("click",()=>first++);
  native[1].addEventListener("click",()=>second++);
  T.scanForChats();
  const link=[...T.getHost().shadowRoot.querySelectorAll(".chat-link")].find(n=>n.textContent==="Second chat");
  link.dispatchEvent(new w.MouseEvent("click",{bubbles:true,cancelable:true,button:0}));
  assert.equal(first,0); assert.equal(second,1);
});
test("folder assignment rejects unverified title keys",async()=>{
  const {T}=await boot({titles:["Stable chat"]});
  const folder={id:"f",name:"Folder",color:"#4285F4",children:[],chat_urls:[]};
  T.state.folders=[folder];
  T.assignChat("t:some title",folder);
  assert.deepEqual(folder.chat_urls,[]);
  T.assignChat("id:thread-0",folder);
  assert.deepEqual(folder.chat_urls,["id:thread-0"]);
});
test("DOM snapshot reports role count without exposing conversation text",async()=>{
  const {w,T}=await boot({titles:["Sensitive title"]});
  w.document.querySelector("main").innerHTML=[
    '<div data-message-author-role="user">VERY PRIVATE USER MESSAGE</div>',
    '<div data-message-author-role="assistant">PRIVATE AI ANSWER</div>',
    '<div data-message-author-role="user">ANOTHER PRIVATE USER MESSAGE</div>'
  ].join("");
  const snapshot=T.buildSnapshot(T.scanHistory());
  assert.ok(snapshot.includes("Реплик пользователя: 2"));
  assert.ok(snapshot.includes("data-message-author-role"));
  assert.ok(!snapshot.includes("VERY PRIVATE") && !snapshot.includes("PRIVATE AI ANSWER"));
});

test("opening a stable AI Mode session stores its user-turn count",async()=>{
  const url="https://www.google.com/search?udm=50#thread=thread-77";
  const {w,T,saved}=await boot({titles:["History item"],url});
  const main=w.document.querySelector("main");
  main.innerHTML=[
    '<div data-message-author-role="user">Question one</div>',
    '<div data-message-author-role="assistant">Answer one</div>',
    '<div data-message-author-role="user">Question two</div>',
    '<div data-message-author-role="assistant">Answer two</div>'
  ].join("");
  T.captureCurrentPage();
  assert.equal(T.state.chats["id:thread-77"].userMessageCount,2);
  assert.equal(T.state.chats["id:thread-77"].classification,"multi-turn");
  await sleep(0);
  assert.equal(saved.google_ai_chats["id:thread-77"].userMessageCount,2);
});

test("organizer teardown restores native history when sidebar disappears",async()=>{
  const {w,T}=await boot({titles:["A chat"]});
  T.scanForChats(); assert.ok(T.getHost());
  w.document.querySelector("nav").remove();
  T.scanForChats(); T.scanForChats(); T.scanForChats();
  assert.equal(T.getHost(),null);
});

(async()=>{
  let failed=0;
  for(const [name,run] of tests){
    try{await run();console.log("ok  "+name);}
    catch(error){failed++;console.error("FAIL "+name+"\n"+(error.stack||error).toString().split("\n").slice(0,7).join("\n"));}
  }
  console.log(failed ? String(failed)+" failed of "+tests.length : "all "+tests.length+" passed");
  process.exit(failed?1:0);
})();
