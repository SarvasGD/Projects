(() => {
  "use strict";

  const FOLDERS_KEY = "google_ai_folders";
  const CHATS_KEY = "google_ai_chats";
  const MAX_DEPTH = 4;
  const MAX_INDEX_TEXT = 10000;
  const MAX_INDEXED_CHATS = 100;
  const FOLDER_COLORS = ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#A142F4", "#00ACC1", "#F4511E", "#8D6E63"];
  const RECENT_LABEL = /^(recent|recent chats|recent searches|недавние|недавнее|récents|recientes|zuletzt|最近|最近の会話|최근|son aramalar)(?: *[0-9]+)?$/i;

  const state = { folders: [], chats: {} };
  const openFolders = new Set();
  const hiddenRows = new Map();
  const dragBoundAnchors = new WeakSet();
  const primedHistoryScrollers = new WeakSet();
  let activeHistoryPriming = null;
  let host = null;
  let shadow = null;
  let ui = null;
  let diagnosticHost = null;
  let diagnosticInfo = null;
  let diagnosticDismissed = false;
  let currentContainer = null;
  let observer = null;
  let scanTimer = null;
  let captureTimer = null;
  let storageQueue = Promise.resolve();

  function storageGet(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(result || {});
      });
    });
  }

  function storageSet(value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(value, () => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve();
      });
    });
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "folder_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  function normalizeUrl(value) {
    try {
      const url = new URL(value, location.href);
      const h = url.hostname.toLowerCase();
      const isGoogle = h === "google.com" || h.endsWith(".google.com") ||
        h === "google.ru" || h.endsWith(".google.ru") ||
        h === "google.se" || h.endsWith(".google.se") ||
        h === "google.co.uk" || h.endsWith(".google.co.uk") ||
        h === "google.de" || h.endsWith(".google.de") ||
        h === "google.fr" || h.endsWith(".google.fr") ||
        h === "google.es" || h.endsWith(".google.es") ||
        h === "google.ca" || h.endsWith(".google.ca") ||
        h === "google.com.au" || h.endsWith(".google.com.au") ||
        h === "google.co.in" || h.endsWith(".google.co.in");
      if (!isGoogle || url.pathname !== "/search" || !url.searchParams.get("q") || url.protocol !== "https:") return null;
      url.hash = "";
      return url.href;
    } catch (_error) {
      return null;
    }
  }

  function getQueryFromUrl(value) {
    try { return new URL(value).searchParams.get("q") || ""; }
    catch (_error) { return ""; }
  }

  function isLikelyAiUrl(value) {
    try {
      const url = new URL(value, location.href);
      return url.searchParams.get("udm") === "50" || url.searchParams.has("aep") || url.searchParams.has("vsrid");
    } catch (_error) { return false; }
  }

  function isCurrentAiPage() {
    if (!normalizeUrl(location.href)) return false;
    if (isLikelyAiUrl(location.href)) return true;
    const title = (document.title || "").toLowerCase();
    if (title.includes("ai mode") || title.includes("режим ии") || title.includes("режим искусственного интеллекта")) return true;
    const activeMode = document.querySelector('[aria-current="page"],[aria-selected="true"]');
    const activeLabel = activeMode ? (activeMode.getAttribute("aria-label") || activeMode.innerText || activeMode.textContent || "").toLowerCase() : "";
    return activeLabel.includes("ai mode") || activeLabel.includes("режим ии");
  }

  function titleForUrl(url) {
    return (getQueryFromUrl(url) || "Чат Google AI").slice(0, 140);
  }

  function titleFromAnchor(anchor, url) {
    const text = (anchor.innerText || anchor.textContent || anchor.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
    return text && text.length > 1 && text.length < 180 ? text : titleForUrl(url);
  }

  function normalizeFolderList(list, depth) {
    if (!Array.isArray(list) || depth > MAX_DEPTH) return [];
    return list.map((raw) => {
      const item = raw && typeof raw === "object" ? raw : {};
      return {
        id: typeof item.id === "string" ? item.id : makeId(),
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Новая папка",
        color: /^#[0-9a-f]{6}$/i.test(item.color || "") ? item.color : FOLDER_COLORS[0],
        children: normalizeFolderList(item.children, depth + 1),
        chat_urls: Array.isArray(item.chat_urls) ? Array.from(new Set(item.chat_urls.map(normalizeUrl).filter(Boolean))) : []
      };
    });
  }

  function collectAssignedUrls(folders, output) {
    const result = output || [];
    (folders || []).forEach((folder) => {
      (folder.chat_urls || []).forEach((url) => result.push(url));
      collectAssignedUrls(folder.children || [], result);
    });
    return result;
  }

  async function loadState() {
    const stored = await storageGet([FOLDERS_KEY, CHATS_KEY]);
    state.folders = normalizeFolderList(stored[FOLDERS_KEY], 1);
    const chats = stored[CHATS_KEY] && typeof stored[CHATS_KEY] === "object" ? stored[CHATS_KEY] : {};
    state.chats = {};
    Object.keys(chats).forEach((rawUrl) => {
      const url = normalizeUrl(rawUrl);
      if (!url) return;
      const item = chats[rawUrl] || {};
      state.chats[url] = {
        title: typeof item.title === "string" && item.title.trim() ? item.title : titleForUrl(url),
        text: typeof item.text === "string" ? item.text.slice(0, MAX_INDEX_TEXT) : "",
        updatedAt: Number(item.updatedAt) || 0
      };
    });
    collectAssignedUrls(state.folders).forEach((url) => {
      if (!state.chats[url]) state.chats[url] = { title: titleForUrl(url), text: "", updatedAt: 0 };
    });
  }

  function findFolder(folders, id) {
    for (const folder of folders) {
      if (folder.id === id) return folder;
      const nested = findFolder(folder.children || [], id);
      if (nested) return nested;
    }
    return null;
  }

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function createButton(text, title, callback, className) {
    const button = createElement("button", className || "mini-button", text);
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      callback(event);
    });
    return button;
  }

  function setStatus(message) {
    if (ui && ui.status) ui.status.textContent = message;
  }

  function persist() {
    const value = {};
    value[FOLDERS_KEY] = state.folders;
    value[CHATS_KEY] = state.chats;
    storageQueue = storageQueue.then(() => storageSet(value)).catch((error) => {
      console.warn("[GSACO] Could not save local data:", error);
      setStatus("Не удалось сохранить данные. Проверьте свободное место в хранилище.");
    });
    return storageQueue;
  }

  function getFolderDepth(folders, id, depth) {
    const currentDepth = depth || 1;
    for (const folder of folders) {
      if (folder.id === id) return currentDepth;
      const nested = getFolderDepth(folder.children || [], id, currentDepth + 1);
      if (nested) return nested;
    }
    return 0;
  }

  function addFolder(parentId) {
    const parent = parentId ? findFolder(state.folders, parentId) : null;
    if (parentId && (!parent || !Array.isArray(parent.children) || getFolderDepth(state.folders, parentId, 1) >= MAX_DEPTH)) return;
    const folder = {
      id: makeId(),
      name: parentId ? "Новая подпапка" : "Новая папка",
      color: FOLDER_COLORS[0],
      children: [],
      chat_urls: []
    };
    (parent ? parent.children : state.folders).push(folder);
    openFolders.add(folder.id);
    if (parentId) openFolders.add(parentId);
    render();
    const name = window.prompt("Название папки:", folder.name);
    if (name && name.trim()) folder.name = name.trim();
    persist();
    render();
  }

  function removeFolderFromList(list, id, parentList) {
    for (let index = 0; index < list.length; index += 1) {
      const folder = list[index];
      if (folder.id === id) {
        const parent = parentList || list;
        const promoted = (folder.children || []).slice();
        parent.splice(index, 1, ...promoted);
        // Chat records stay in state.chats and become visible under Без папки.
        return true;
      }
      if (removeFolderFromList(folder.children || [], id, folder.children)) return true;
    }
    return false;
  }

  function removeChatFromFolders(folders, url) {
    (folders || []).forEach((folder) => {
      folder.chat_urls = (folder.chat_urls || []).filter((item) => item !== url);
      removeChatFromFolders(folder.children || [], url);
    });
  }

  function assignChat(url, folder) {
    const cleanUrl = normalizeUrl(url);
    if (!cleanUrl || !folder) return;
    if (!state.chats[cleanUrl]) state.chats[cleanUrl] = { title: titleForUrl(cleanUrl), text: "", updatedAt: Date.now() };
    removeChatFromFolders(state.folders, cleanUrl);
    folder.chat_urls = folder.chat_urls || [];
    folder.chat_urls.push(cleanUrl);
    persist();
    render();
  }

  function getAllChatUrls() {
    const urls = new Set(Object.keys(state.chats));
    collectAssignedUrls(state.folders).forEach((url) => urls.add(url));
    return Array.from(urls);
  }

  function exportChat(url, format) {
    const item = state.chats[url];
    if (!item || !item.text) {
      window.alert("Текст этой сессии ещё не проиндексирован. Откройте чат в Google AI Mode, чтобы расширение сохранило его текст, затем повторите экспорт.");
      return;
    }
    const title = item.title || titleForUrl(url);
    const output = format === "md"
      ? "# " + title + "\n\nИсточник: " + url + "\n\n" + item.text + "\n"
      : title + "\n" + url + "\n\n" + item.text + "\n";
    const blob = new Blob(["\uFEFF", output], { type: format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = title.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 70) || "google-ai-chat";
    link.href = objectUrl;
    link.download = safeName + "." + format;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }

  function createChatRow(url) {
    const item = state.chats[url] || { title: titleForUrl(url), text: "", updatedAt: 0 };
    const row = createElement("div", "chat-row");
    const link = createElement("a", "chat-link", item.title || titleForUrl(url));
    link.href = url;
    link.title = url;
    link.draggable = true;
    if (!item.text) link.classList.add("not-indexed");
    link.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/x-google-ai-chat-url", url);
      event.dataTransfer.setData("text/uri-list", url);
      event.dataTransfer.setData("text/plain", url);
    });
    row.appendChild(link);
    const actions = createElement("div", "chat-actions");
    actions.appendChild(createButton("MD", "Экспортировать в Markdown", () => exportChat(url, "md"), "export-button"));
    actions.appendChild(createButton("TXT", "Экспортировать в TXT", () => exportChat(url, "txt"), "export-button"));
    row.appendChild(actions);
    return row;
  }

  function addDropTarget(element, folder) {
    element.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      element.classList.add("drop-target");
    });
    element.addEventListener("dragleave", (event) => {
      if (!element.contains(event.relatedTarget)) element.classList.remove("drop-target");
    });
    element.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      element.classList.remove("drop-target");
      let raw = event.dataTransfer.getData("text/x-google-ai-chat-url");
      if (!raw) raw = event.dataTransfer.getData("text/uri-list");
      if (!raw) raw = event.dataTransfer.getData("text/plain");
      raw = (raw || "").split(/\r?\n/).find((line) => line && !line.startsWith("#")) || "";
      const url = normalizeUrl(raw.trim());
      if (!url) {
        setStatus("Сюда можно перетащить ссылку на поисковый чат Google AI.");
        return;
      }
      assignChat(url, folder);
    });
  }

  function countNestedChats(folders) {
    let count = 0;
    (folders || []).forEach((folder) => {
      count += (folder.chat_urls || []).length + countNestedChats(folder.children || []);
    });
    return count;
  }

  function renderFolder(folder, depth) {
    const details = createElement("details", "folder");
    details.open = openFolders.has(folder.id);
    details.addEventListener("toggle", () => {
      if (details.open) openFolders.add(folder.id);
      else openFolders.delete(folder.id);
    });
    addDropTarget(details, folder);

    const summary = createElement("summary", "folder-summary");
    const marker = createElement("span", "folder-marker");
    marker.style.backgroundColor = folder.color || FOLDER_COLORS[0];
    const name = createElement("span", "folder-name", folder.name);
    const count = (folder.chat_urls || []).length + countNestedChats(folder.children || []);
    const badge = createElement("span", "folder-count", String(count));
    const actions = createElement("span", "folder-actions");

    if (depth < MAX_DEPTH) {
      actions.appendChild(createButton("+", "Создать подпапку", () => addFolder(folder.id)));
    }
    actions.appendChild(createButton("✎", "Переименовать папку", () => {
      const next = window.prompt("Название папки:", folder.name);
      if (next && next.trim()) { folder.name = next.trim(); persist(); render(); }
    }));
    actions.appendChild(createButton("●", "Изменить цвет папки", () => {
      const next = window.prompt("Цвет в формате HEX:", folder.color || FOLDER_COLORS[0]);
      if (next && /^#[0-9a-f]{6}$/i.test(next.trim())) { folder.color = next.trim(); persist(); render(); }
      else if (next) window.alert("Укажите цвет в формате #4285F4.");
    }));
    actions.appendChild(createButton("×", "Удалить папку", () => {
      if (!window.confirm("Удалить папку «" + folder.name + "»? Вложенные папки будут подняты на уровень выше.")) return;
      removeFolderFromList(state.folders, folder.id, null);
      openFolders.delete(folder.id);
      persist();
      render();
    }));
    summary.append(marker, name, badge, actions);
    details.appendChild(summary);

    const children = createElement("div", "folder-contents");
    (folder.chat_urls || []).forEach((url) => children.appendChild(createChatRow(url)));
    (folder.children || []).forEach((nested) => children.appendChild(renderFolder(nested, depth + 1)));
    if (!children.childElementCount) children.appendChild(createElement("div", "empty-note", "Перетащите сюда ссылку на чат"));
    details.appendChild(children);
    return details;
  }

  function renderSearchResults(query) {
    const normalized = query.toLocaleLowerCase();
    const matching = getAllChatUrls().map((url) => {
      const item = state.chats[url] || { title: titleForUrl(url), text: "" };
      const source = (item.title + "\n" + item.text + "\n" + url).toLocaleLowerCase();
      return { url: url, item: item, matched: source.includes(normalized) };
    }).filter((entry) => entry.matched);
    ui.tree.appendChild(createElement("div", "search-caption", "Найдено: " + matching.length));
    if (!matching.length) {
      ui.tree.appendChild(createElement("div", "empty-note", "Совпадений нет. Индекс пополняется при открытии AI-чатов."));
      return;
    }
    matching.sort((a, b) => (b.item.updatedAt || 0) - (a.item.updatedAt || 0));
    matching.forEach((entry) => ui.tree.appendChild(createChatRow(entry.url)));
  }

  function render() {
    if (!ui || !ui.tree) return;
    ui.tree.replaceChildren();
    const query = ui.search.value.trim();
    if (query) {
      renderSearchResults(query);
    } else {
      state.folders.forEach((folder) => ui.tree.appendChild(renderFolder(folder, 1)));
      const assigned = new Set(collectAssignedUrls(state.folders));
      const unassigned = getAllChatUrls().filter((url) => !assigned.has(url));
      const recent = createElement("details", "folder unassigned");
      recent.open = true;
      const summary = createElement("summary", "folder-summary");
      summary.append(createElement("span", "folder-marker neutral-marker"));
      summary.append(createElement("span", "folder-name", "Без папки"));
      summary.append(createElement("span", "folder-count", String(unassigned.length)));
      recent.appendChild(summary);
      const contents = createElement("div", "folder-contents");
      if (unassigned.length) {
        unassigned.sort((a, b) => ((state.chats[b] || {}).updatedAt || 0) - ((state.chats[a] || {}).updatedAt || 0));
        unassigned.forEach((url) => contents.appendChild(createChatRow(url)));
      } else {
        contents.appendChild(createElement("div", "empty-note", "Новые найденные AI-чаты появятся здесь."));
      }
      recent.appendChild(contents);
      ui.tree.appendChild(recent);
    }
    const all = getAllChatUrls();
    const indexed = all.filter((url) => state.chats[url] && state.chats[url].text).length;
    setStatus(all.length + " чатов · " + indexed + " проиндексировано · хранение локально");
  }

  function createInterface() {
    host = document.createElement("div");
    host.id = "google-search-ai-chat-organizer";
    host.style.cssText = "display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin:8px 0;position:static;flex:0 0 auto;grid-column:1 / -1;clear:both;";
    shadow = host.attachShadow({ mode: "open" });

    const style = createElement("style");
    style.textContent = [
      ":host { all: initial; display:block; width:100%; color-scheme:light dark; font-family:Arial,sans-serif; }",
      "* { box-sizing:border-box; }",
      ".panel { color:var(--gsaco-text,#202124); background:var(--gsaco-bg,#fff); border:1px solid var(--gsaco-border,#dadce0); border-radius:12px; padding:10px; font:13px/1.4 Arial,sans-serif; width:100%; min-width:0; }",
      ".header { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:9px; }",
      ".brand { min-width:0; } .brand strong { display:block; font-size:13px; font-weight:700; } .brand small { display:block; color:var(--gsaco-muted,#5f6368); font-size:10px; }",
      "button { font:inherit; cursor:pointer; } .primary { border:0; border-radius:8px; padding:6px 9px; background:#1a73e8; color:white; font-weight:600; white-space:nowrap; } .primary:hover { background:#1765cc; }",
      ".search-wrap { display:flex; align-items:center; gap:7px; border:1px solid var(--gsaco-border,#dadce0); border-radius:8px; padding:0 8px; margin:0 0 8px; background:var(--gsaco-input,#fff); }",
      ".search-icon { color:var(--gsaco-muted,#5f6368); font-size:16px; } input { min-width:0; width:100%; height:32px; border:0; outline:0; background:transparent; color:inherit; font:inherit; }",
      ".tree { max-height:48vh; min-height:34px; overflow:auto; overscroll-behavior:contain; } details { min-width:0; } .folder { margin:2px 0; border-radius:7px; }",
      ".folder-summary { list-style:none; display:flex; align-items:center; gap:6px; min-height:31px; padding:4px 5px; border-radius:7px; cursor:pointer; user-select:none; } .folder-summary::-webkit-details-marker { display:none; }",
      ".folder-summary::before { content:'›'; display:inline-block; width:9px; color:var(--gsaco-muted,#5f6368); transition:transform .12s ease; } details[open] > .folder-summary::before { transform:rotate(90deg); }",
      ".folder-marker { flex:0 0 9px; width:9px; height:9px; border-radius:3px; } .neutral-marker { background:#9aa0a6; }",
      ".folder-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; } .folder-count { color:var(--gsaco-muted,#5f6368); font-size:10px; }",
      ".folder-actions { display:flex; align-items:center; gap:1px; opacity:.75; } .mini-button { border:0; color:var(--gsaco-muted,#5f6368); background:transparent; border-radius:5px; min-width:21px; height:21px; padding:0 4px; font-size:13px; }",
      ".mini-button:hover,.export-button:hover { background:var(--gsaco-hover,#f1f3f4); color:var(--gsaco-text,#202124); } .folder-contents { margin-left:13px; padding-left:8px; border-left:1px solid var(--gsaco-border,#dadce0); }",
      ".chat-row { display:flex; align-items:center; gap:4px; min-width:0; padding:4px 3px 4px 5px; border-radius:6px; } .chat-row:hover { background:var(--gsaco-hover,#f8f9fa); }",
      ".chat-link { flex:1; min-width:0; color:var(--gsaco-link,#1a73e8); text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; } .chat-link:hover { text-decoration:underline; } .chat-link.not-indexed { color:var(--gsaco-muted,#5f6368); }",
      ".chat-actions { display:flex; gap:2px; flex:0 0 auto; } .export-button { border:1px solid transparent; border-radius:4px; background:transparent; color:var(--gsaco-muted,#5f6368); padding:2px 3px; font-size:9px; }",
      ".empty-note,.search-caption { color:var(--gsaco-muted,#5f6368); font-size:11px; padding:7px 6px; } .search-caption { font-weight:600; }",
      ".status { border-top:1px solid var(--gsaco-border,#dadce0); margin-top:8px; padding-top:7px; font-size:10px; color:var(--gsaco-muted,#5f6368); }",
      ".drop-target > .folder-summary,.drop-target { background:rgba(26,115,232,.10); outline:1px dashed #1a73e8; outline-offset:-1px; }",
      "@media (prefers-color-scheme:dark) { :host { color-scheme:dark; } .panel { --gsaco-text:#e8eaed; --gsaco-bg:#202124; --gsaco-border:#5f6368; --gsaco-muted:#bdc1c6; --gsaco-input:#292a2d; --gsaco-hover:#303134; --gsaco-link:#8ab4f8; } }",
      "@media (prefers-color-scheme:light) { :host { color-scheme:light; } }"
    ].join("\n");
    shadow.appendChild(style);

    const panel = createElement("section", "panel");
    const header = createElement("div", "header");
    const brand = createElement("div", "brand");
    brand.append(createElement("strong", "", "AI Chat Organizer"));
    brand.append(createElement("small", "", "Папки для поисковых AI-диалогов"));
    const add = createButton("+ Папка", "Создать папку верхнего уровня", () => addFolder(), "primary");
    header.append(brand, add);

    const searchWrap = createElement("label", "search-wrap");
    searchWrap.appendChild(createElement("span", "search-icon", "⌕"));
    const search = createElement("input");
    search.type = "search";
    search.placeholder = "Поиск по названиям и тексту чатов";
    search.setAttribute("aria-label", "Поиск по AI-чатам");
    search.addEventListener("input", render);
    searchWrap.appendChild(search);

    const tree = createElement("div", "tree");
    const status = createElement("div", "status");
    panel.append(header, searchWrap, tree, status);
    shadow.appendChild(panel);
    ui = { tree: tree, status: status, search: search };
    render();
  }

  function countSearchLinks(container) {
    return Array.from(container.querySelectorAll("a[href]"))
      .map((anchor) => ({ anchor: anchor, url: normalizeUrl(anchor.href) }))
      .filter((entry) => entry.url);
  }

  function isRecentLabel(element) {
    if (!element || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8 || rect.bottom < 0 || rect.top > window.innerHeight) return false;

    // Prefer rendered text. An aria-label can describe a hidden history
    // control (for example "История режима ИИ") rather than the visible
    // "Недавнее" heading, which previously produced a zero-sized false hit.
    const renderedText = (element.textContent || "").replace(/\s+/g, " ").trim();
    const ariaText = (element.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
    const candidates = [renderedText, ariaText].filter(Boolean);
    return candidates.some((label) => label.length <= 48 && RECENT_LABEL.test(label));
  }

  function isSidebarContainer(element, headingRect) {
    if (!element || element === document.body || element === document.documentElement || !headingRect) return false;
    const rect = element.getBoundingClientRect();
    const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const maxWidth = Math.min(620, width * 0.65);
    const headingLeft = headingRect.left;

    // A valid container must begin at the heading's left edge and remain a
    // bounded-width vertical rail containing the history section.
    return rect.width >= 110 &&
      rect.height >= 100 &&
      rect.left >= headingLeft - 72 &&
      rect.left <= headingLeft + 24 &&
      rect.right >= headingRect.right &&
      rect.right <= headingLeft + maxWidth &&
      rect.width <= maxWidth;
  }

  function findRecentSection() {
    const labels = Array.from(document.querySelectorAll("h1,h2,h3,[role='heading'],[aria-label],span,div"))
      .filter(isRecentLabel);
    if (!labels.length) return null;

    const candidates = new Map();
    labels.forEach((label) => {
      const headingRect = label.getBoundingClientRect();
      if (!headingRect.width || !headingRect.height) return;

      let ancestor = label.parentElement;
      for (let depth = 1; depth <= 14 && ancestor && ancestor !== document.body; depth += 1) {
        if (isSidebarContainer(ancestor, headingRect)) {
          // The ancestor is already validated as the narrow rail around
          // the visible Recent heading. Count its chat links directly:
          // individual anchor coordinates can shift during Google's
          // dynamic layout updates and caused found/not-found flicker.
          const links = countSearchLinks(ancestor);
          if (links.length >= 1) {
            const semantic = /^(NAV|ASIDE)$/.test(ancestor.tagName) ||
              ancestor.getAttribute("role") === "navigation" ? 1 : 0;
            const rect = ancestor.getBoundingClientRect();
            const score = links.length * 100 + semantic * 25 -
              rect.width * 0.25 - rect.height * 0.005 - depth * 2;
            const previous = candidates.get(ancestor);
            if (!previous || score > previous.score) {
              candidates.set(ancestor, {
                container: ancestor,
                heading: label,
                links: links,
                score: score,
                explicit: true
              });
            }
          }
        }
        ancestor = ancestor.parentElement;
      }
    });

    if (!candidates.size) return null;
    return Array.from(candidates.values()).sort((a, b) => b.score - a.score)[0];
  }

  function getRowForAnchor(anchor, container) {
    const semanticRow = anchor.closest("li,[role='listitem']");
    if (semanticRow && semanticRow !== container && container.contains(semanticRow)) return semanticRow;
    const parent = anchor.parentElement;
    if (parent && parent !== container && parent.querySelectorAll("a[href]").length === 1 &&
        parent.querySelectorAll("button,[role='button']").length === 0 && parent.textContent.length < 500) return parent;
    return anchor;
  }

  function hideNativeLinks(section) {
    if (!section.explicit) return;
    section.links.forEach((entry) => {
      const row = getRowForAnchor(entry.anchor, section.container);
      if (!row || row === section.container || row === host || row.contains(host)) return;
      if (!hiddenRows.has(row)) hiddenRows.set(row, { style: row.getAttribute("style"), hidden: row.hasAttribute("hidden") });
      row.style.setProperty("display", "none", "important");
    });
  }

  function restoreHiddenRows() {
    hiddenRows.forEach((original, row) => {
      if (!row || !row.isConnected) return;
      if (original.style === null) row.removeAttribute("style");
      else row.setAttribute("style", original.style);
      if (original.hidden) row.setAttribute("hidden", "");
      else row.removeAttribute("hidden");
    });
    hiddenRows.clear();
  }

  function mountInterface(section) {
    if (currentContainer !== section.container) {
      restoreHiddenRows();
      if (host) host.remove();
      currentContainer = section.container;
      host = null;
      shadow = null;
      ui = null;
    }
    if (!host) createInterface();
    if (!host.isConnected) {
      // Insert after the heading's top-level row inside the detected history
      // rail. Inserting after the heading node itself can put the panel beside
      // the heading when Google's wrapper uses a horizontal flex layout.
      let headingRow = section.heading;
      while (headingRow && headingRow.parentElement && headingRow.parentElement !== section.container) {
        headingRow = headingRow.parentElement;
      }
      if (headingRow && headingRow.parentElement === section.container) {
        headingRow.after(host);
      } else {
        section.container.prepend(host);
      }
    }
  }

  function removeDetectionDiagnostic() {
    if (diagnosticHost) diagnosticHost.remove();
    diagnosticHost = null;
    diagnosticInfo = null;
  }

  function isDiagnosticMutation(mutation) {
    if (!diagnosticHost) return false;
    if (diagnosticHost === mutation.target || diagnosticHost.contains(mutation.target)) return true;
    if (mutation.type === "childList") {
      const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
      if (changedNodes.length && changedNodes.every((node) =>
        node === diagnosticHost || diagnosticHost.contains(node)
      )) return true;
    }
    return false;
  }

  function updateDetectionDiagnostic(section) {
    let pageUrl;
    try { pageUrl = new URL(location.href); }
    catch (_error) { removeDetectionDiagnostic(); return; }

    const supportedDomains = [
      "google.com", "google.ru", "google.se", "google.co.uk", "google.de",
      "google.fr", "google.es", "google.ca", "google.com.au", "google.co.in"
    ];
    const supportedGoogle = supportedDomains.some((domain) =>
      pageUrl.hostname === domain || pageUrl.hostname.endsWith("." + domain)
    );
    if (!supportedGoogle || pageUrl.pathname !== "/search" || diagnosticDismissed) {
      removeDetectionDiagnostic();
      return;
    }

    if (!diagnosticHost || !diagnosticHost.isConnected) {
      diagnosticHost = document.createElement("div");
      diagnosticHost.id = "gsaco-detection-diagnostic";
      diagnosticHost.style.cssText = "position:fixed;top:76px;right:12px;z-index:2147483647;width:min(380px,calc(100vw - 24px));max-height:42vh;box-sizing:border-box;pointer-events:auto;";
      const root = diagnosticHost.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = ":host{all:initial;pointer-events:auto}section{font:12px/1.4 Arial,sans-serif;background:#202124;color:#e8eaed;border:1px solid #fbbc04;border-radius:9px;box-shadow:0 3px 16px #0008;padding:10px;max-height:42vh;overflow:auto;pointer-events:auto}header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}strong{color:#fbbc04;font-size:12px}button{font:11px Arial,sans-serif;color:#e8eaed;background:#3c4043;border:1px solid #5f6368;border-radius:5px;padding:4px 7px;cursor:pointer}button:hover{background:#4b5055}pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font:11px/1.45 Consolas,monospace;color:#e8eaed;user-select:text}";
      const panel = document.createElement("section");
      const header = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = "AI Chat Organizer — диагностика";
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:5px";
      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.textContent = "Копировать";
      copyButton.addEventListener("click", async () => {
        const text = diagnosticInfo ? diagnosticInfo.textContent : "";
        try {
          await navigator.clipboard.writeText(text);
          copyButton.textContent = "Скопировано";
        } catch (_error) {
          const temporary = document.createElement("textarea");
          temporary.value = text;
          temporary.style.cssText = "position:fixed;left:-10000px;top:0";
          document.body.appendChild(temporary);
          temporary.select();
          const copied = document.execCommand("copy");
          temporary.remove();
          copyButton.textContent = copied ? "Скопировано" : "Выделите текст";
        }
      });
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.textContent = "Скрыть";
      closeButton.addEventListener("click", () => {
        diagnosticDismissed = true;
        removeDetectionDiagnostic();
      });
      actions.append(copyButton, closeButton);
      header.append(title, actions);
      diagnosticInfo = document.createElement("pre");
      panel.append(header, diagnosticInfo);
      root.append(style, panel);
      document.documentElement.appendChild(diagnosticHost);
    }

    const labels = Array.from(document.querySelectorAll("h1,h2,h3,[role='heading'],[aria-label],span,div"))
      .filter(isRecentLabel);
    const allLinks = countSearchLinks(document);
    const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const lines = [
      "Скрипт расширения: ЗАГРУЖЕН",
      "Страница: " + pageUrl.pathname + " · " + pageUrl.hostname,
      "Ширина viewport: " + Math.round(width) + " CSS px",
      "Ссылок Google Search с q: " + allLinks.length,
      "Видимых заголовков Recent / Недавнее: " + labels.length
    ];

    if (section) {
      const rect = section.container.getBoundingClientRect();
      const headingRect = section.heading.getBoundingClientRect();
      lines.push("Кандидат панели истории: НАЙДЕН");
      lines.push("Контейнер: " + section.container.tagName.toLowerCase() +
        " x=" + Math.round(rect.left) +
        " w=" + Math.round(rect.width) +
        " h=" + Math.round(rect.height) +
        " links=" + section.links.length);
      lines.push("Заголовок: «" + (section.heading.textContent || "").replace(/\s+/g, " ").trim().slice(0, 45) +
        "» x=" + Math.round(headingRect.left) + " y=" + Math.round(headingRect.top));
    } else {
      lines.push("Кандидат панели истории: НЕ НАЙДЕН");
    }

    labels.slice(0, 5).forEach((label, index) => {
      const labelRect = label.getBoundingClientRect();
      const labelText = (label.textContent || label.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 45);
      lines.push("");
      lines.push("Видимый заголовок " + (index + 1) + ": «" + labelText + "» x=" + Math.round(labelRect.left) +
        " y=" + Math.round(labelRect.top) + " w=" + Math.round(labelRect.width) +
        " h=" + Math.round(labelRect.height));
      let ancestor = label.parentElement;
      let depth = 0;
      while (ancestor && ancestor !== document.body && depth < 10) {
        const rect = ancestor.getBoundingClientRect();
        const links = countSearchLinks(ancestor);
        if (links.length || depth < 2) {
          lines.push("  " + ancestor.tagName.toLowerCase() +
            " x=" + Math.round(rect.left) +
            " w=" + Math.round(rect.width) +
            " h=" + Math.round(rect.height) +
            " links=" + links.length);
        }
        ancestor = ancestor.parentElement;
        depth += 1;
      }
    });

    if (!labels.length && allLinks.length) {
      lines.push("");
      lines.push("Примеры ссылок:");
      allLinks.slice(0, 5).forEach((entry) => {
        const rect = entry.anchor.getBoundingClientRect();
        lines.push("  x=" + Math.round(rect.left) + " y=" + Math.round(rect.top) +
          " · " + (entry.anchor.textContent || "").replace(/\s+/g, " ").trim().slice(0, 35));
      });
    }

    const diagnosticText = lines.join("\n");
    if (diagnosticInfo.textContent !== diagnosticText) diagnosticInfo.textContent = diagnosticText;
  }

  function recordDiscoveredChat(url, title) {
    if (!state.chats[url]) {
      state.chats[url] = { title: title || titleForUrl(url), text: "", updatedAt: Date.now() };
      return true;
    }
    const item = state.chats[url];
    if (title && title.length > 1 && title.length < 180 &&
        (!item.title || item.title === titleForUrl(url) || item.title.length > title.length)) {
      if (item.title !== title) { item.title = title; return true; }
    }
    return false;
  }

  function bindNativeAnchorDrag(anchor, url) {
    if (dragBoundAnchors.has(anchor)) return;
    dragBoundAnchors.add(anchor);
    anchor.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/x-google-ai-chat-url", url);
      event.dataTransfer.setData("text/uri-list", url);
      event.dataTransfer.setData("text/plain", url);
    });
  }

  function findHistoryScrollContainer(section) {
    const firstAnchor = section.links[0] && section.links[0].anchor;
    if (!firstAnchor) return null;
    let node = firstAnchor.parentElement;
    for (let depth = 0; depth < 14 && node; depth += 1) {
      const style = window.getComputedStyle(node);
      const scrollable = /(auto|scroll|overlay)/.test(style.overflowY || "") &&
        node.scrollHeight > node.clientHeight + 60;
      if (scrollable) return node;
      if (node === section.container) break;
      node = node.parentElement;
    }
    return null;
  }

  function finishHistoryPriming(scroller, initialScrollTop) {
    if (scroller && scroller.isConnected) scroller.scrollTop = initialScrollTop;
    activeHistoryPriming = null;
    scheduleScan();
  }

  function advanceHistoryPriming(scroller, sectionContainer, progress) {
    if (!scroller || !scroller.isConnected || !sectionContainer || !sectionContainer.isConnected) {
      finishHistoryPriming(scroller, progress.initialScrollTop);
      return;
    }

    scroller.scrollTop = scroller.scrollHeight;
    progress.steps += 1;
    window.setTimeout(() => {
      const count = countSearchLinks(sectionContainer).length;
      if (count > progress.previousCount) {
        progress.previousCount = count;
        progress.stableSteps = 0;
      } else {
        progress.stableSteps += 1;
      }

      // Stop after the end of the currently available list or a safety cap.
      if (progress.stableSteps >= 3 || progress.steps >= 16) {
        finishHistoryPriming(scroller, progress.initialScrollTop);
        return;
      }
      advanceHistoryPriming(scroller, sectionContainer, progress);
    }, 260);
  }

  function startHistoryPriming(section) {
    const scroller = findHistoryScrollContainer(section);
    if (!scroller || primedHistoryScrollers.has(scroller) || activeHistoryPriming) return;
    primedHistoryScrollers.add(scroller);

    const progress = {
      initialScrollTop: scroller.scrollTop,
      previousCount: countSearchLinks(section.container).length,
      stableSteps: 0,
      steps: 0
    };
    activeHistoryPriming = scroller;
    advanceHistoryPriming(scroller, section.container, progress);
  }

  function scanForChats() {
    const section = findRecentSection();
    let changed = false;
    updateDetectionDiagnostic(section);
    if (!section && currentContainer) {
      // If Google collapses/replaces the history rail, remove the organizer
      // rather than leaving it floating over the conversation/results pane.
      restoreHiddenRows();
      if (host) host.remove();
      currentContainer = null;
      host = null;
      shadow = null;
      ui = null;
    }
    if (section) {
      mountInterface(section);
      section.links.forEach((entry) => {
        if (recordDiscoveredChat(entry.url, titleFromAnchor(entry.anchor, entry.url))) changed = true;
        bindNativeAnchorDrag(entry.anchor, entry.url);
      });

      // Let Google's own lazy-loaded history finish populating before hiding
      // its rows. This imports older sidebar links without opening each chat.
      if (!activeHistoryPriming) startHistoryPriming(section);
      if (!activeHistoryPriming) hideNativeLinks(section);
    }
    const currentUrl = normalizeUrl(location.href);
    if (currentUrl && isCurrentAiPage()) {
      const title = (document.title || "").replace(/\s*-\s*Google Search\s*$/i, "").trim() || titleForUrl(currentUrl);
      if (recordDiscoveredChat(currentUrl, title)) changed = true;
      scheduleCapture();
    }
    if (changed) { persist(); render(); }
    else if (ui && !ui.tree.childElementCount) render();
  }

  function extractPageText() {
    const main = document.querySelector("main,[role='main']");
    const source = main || document.body;
    if (!source) return "";
    const clone = source.cloneNode(true);
    clone.querySelectorAll("#google-search-ai-chat-organizer,script,style,noscript,nav,header,footer").forEach((node) => node.remove());
    const raw = (clone.innerText || clone.textContent || "").replace(/\u00a0/g, " ");
    return raw.split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n").slice(0, MAX_INDEX_TEXT);
  }

  function scheduleCapture() {
    if (captureTimer) window.clearTimeout(captureTimer);
    captureTimer = window.setTimeout(captureCurrentPage, 1200);
  }

  function captureCurrentPage() {
    const url = normalizeUrl(location.href);
    if (!url || !isCurrentAiPage()) return;
    const text = extractPageText();
    const previous = state.chats[url] || { title: titleForUrl(url), text: "", updatedAt: 0 };
    if (text.length < 40 || text === previous.text) return;
    const title = (document.title || "").replace(/\s*-\s*Google Search\s*$/i, "").trim();
    state.chats[url] = { title: title || previous.title || titleForUrl(url), text: text, updatedAt: Date.now() };
    const urls = Object.keys(state.chats).sort((a, b) => (state.chats[b].updatedAt || 0) - (state.chats[a].updatedAt || 0));
    urls.slice(MAX_INDEXED_CHATS).forEach((oldUrl) => { if (oldUrl !== url) state.chats[oldUrl].text = ""; });
    persist();
    render();
  }

  function scheduleScan() {
    if (scanTimer) window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scanForChats, 180);
  }

  async function init() {
    try { await loadState(); }
    catch (error) { console.warn("[GSACO] Could not load local data:", error); state.folders = []; state.chats = {}; }
    scanForChats();
    if (document.documentElement) {
      observer = new MutationObserver((mutations) => {
        if (mutations.every(isDiagnosticMutation)) return;
        scheduleScan();
        if (isCurrentAiPage()) scheduleCapture();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["href"]
      });
    }
    window.addEventListener("popstate", scheduleScan);
    window.addEventListener("hashchange", scheduleScan);
    window.addEventListener("pageshow", scheduleScan);
    window.setTimeout(scheduleScan, 900);
  }

  init();
})();