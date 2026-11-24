(() => {
  "use strict";

  const VERSION = "0.4.0";
  const FOLDERS_KEY = "google_ai_folders";
  const CHATS_KEY = "google_ai_chats";
  const UI_KEY = "google_ai_ui";
  const MAX_DEPTH = 4;
  const MAX_INDEX_TEXT = 10000;
  const MAX_INDEXED_CHATS = 100;
  const HOST_Z_INDEX = 2147483000;
  const FOLDER_COLORS = ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#A142F4", "#00ACC1", "#F4511E", "#8D6E63"];
  const RECENT_LABEL = /^(recent|recent chats|recent searches|недавние|недавнее|récents|recientes|zuletzt|最近|最近の会話|최근|son aramalar)(?: *[0-9]+)?$/i;
  const GOOGLE_DOMAINS = ["google.com", "google.ru", "google.se", "google.co.uk", "google.de", "google.fr", "google.es", "google.ca", "google.com.au", "google.co.in"];
  // Only these URL parameters take part in a chat's identity. Everything else
  // (ved, ei, sei, mstk, aep, source, ...) changes between page loads and used
  // to create duplicates. Extend this list if the diagnostics show a real thread-id parameter.
  const IDENTITY_PARAMS = ["mtid", "tid", "thread", "thread_id", "threadid"];
  const NAV_LABELS = new Set(["новый чат", "new chat", "поиск цепочек", "thread search", "search threads", "настройки", "settings"]);
  const NOISE_ROW = /^(show more|show less|see more|more|показать ещё|показать еще|показать больше|ещё|еще|сегодня|вчера|today|yesterday|last week|previous 7 days|previous 30 days)$/i;
  const CLICKABLE = "a[href],[role='link'],[role='button'],[role='option'],[role='menuitem'],[role='listitem'],li,[tabindex],[jsaction],[data-href]";

  const state = { folders: [], chats: {} };
  const uiPrefs = { open: true, diagHidden: false, messageFilter: "all" };
  const openFolders = new Set();
  const primedScrollers = new WeakSet();
  const completeScrollers = new WeakSet();
  let activePriming = null;
  let host = null;
  let shadow = null;
  let ui = null;
  let region = null;
  let lastScan = null;
  let missCount = 0;
  let currentKey = null;
  let nativeHidden = null;
  let diagnosticHost = null;
  let diagnosticInfo = null;
  let diagnosticSnapshot = null;
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

  function isGoogleHost(hostname) {
    const h = String(hostname || "").toLowerCase();
    return GOOGLE_DOMAINS.some((domain) => h === domain || h.endsWith("." + domain));
  }

  // Stable chat identity: host + path + q/udm + known thread-id params only.
  function toKey(value) {
    try {
      const url = new URL(value, location.href);
      if (url.protocol !== "https:" || !isGoogleHost(url.hostname)) return null;
      if (url.pathname !== "/search" && !/^\/ai(\/|$)/.test(url.pathname)) return null;
      const keep = [];
      ["q", "udm"].concat(IDENTITY_PARAMS).forEach((name) => {
        const v = url.searchParams.get(name);
        if (v) keep.push(name + "=" + encodeURIComponent(v));
      });
      if (!keep.length) return null;
      return "https://" + url.hostname.toLowerCase() + url.pathname + "?" + keep.join("&");
    } catch (_error) {
      return null;
    }
  }

  // Keys: canonical URL, "id:<attribute id>", or "t:<title>"; "|N" marks the N-th
  // row that shares the same base key inside Google's own list.
  function normalizeKey(raw) {
    if (typeof raw !== "string" || !raw) return null;
    const suffix = raw.match(/^(.*)\|(\d+)$/);
    const base = suffix ? suffix[1] : raw;
    const clean = /^(t|id):/.test(base) ? base.slice(0, 300) : toKey(base);
    return clean ? clean + (suffix ? "|" + suffix[2] : "") : null;
  }

  function extractThreadIdFromUrl(value) {
    try {
      const url = new URL(value, location.href);
      if (url.protocol !== "https:" || !isGoogleHost(url.hostname)) return "";
      for (const name of IDENTITY_PARAMS) {
        const value = url.searchParams.get(name);
        if (value && value.length >= 4 && value.length <= 200) return value;
      }
      const hash = (url.hash || "").replace(/^#/, "");
      const params = new URLSearchParams(hash);
      for (const name of ["thread", "thread_id", "threadId", "mtid"]) {
        const value = params.get(name);
        if (value && value.length >= 4 && value.length <= 200) return value;
      }
      const match = hash.match(/(?:^|[&?])(?:thread|thread_id|threadId|mtid)=([A-Za-z0-9._:-]{4,200})(?:&|$)/);
      return match ? decodeURIComponent(match[1]) : "";
    } catch (_error) {
      return "";
    }
  }

  // A history row is a conversation only when Google exposes a stable thread/session identity.
  // Search query URLs (q + udm=50) alone are not sufficient.
  function toStableThreadKey(value) {
    const threadId = extractThreadIdFromUrl(value);
    return threadId ? "id:" + threadId : null;
  }

  function isStableChatKey(value) {
    if (typeof value !== "string") return false;
    if (/^id:[A-Za-z0-9._:-]{4,200}$/.test(value)) return true;
    return !!toStableThreadKey(value);
  }

  function isChatVisibleForFilter(key) {
    const item = state.chats[key] || {};
    const count = Number.isInteger(item.userMessageCount) ? item.userMessageCount : null;
    switch (uiPrefs.messageFilter) {
      case "single": return count === 1;
      case "multi": return count !== null && count >= 2;
      case "unknown": return count === null;
      default: return true;
    }
  }

  function countUserTurns(root) {
    if (!root) return { count: null, source: "unknown" };
    const selectors = [
      '[data-message-author-role="user"]',
      '[data-message-author="user"]',
      '[data-role="user"]',
      "user-query"
    ];
    const selector = selectors.join(",");
    const candidates = Array.from(root.querySelectorAll(selector)).filter((node) =>
      cleanText(node.innerText || node.textContent).length > 0
    );
    const outermost = candidates.filter((node) => !candidates.some((other) => other !== node && other.contains(node)));
    if (outermost.length) return { count: outermost.length, source: "dom-role" };

    const text = String(root.innerText || root.textContent || "").replace(/\u00a0/g, " ");
    const hasConversationHeader = /(?:AI Mode Conversation:|Разговор в режиме ИИ:)/i.test(text);
    if (hasConversationHeader) {
      const markers = text.match(/(?:^|\n)\s*(?:You said|Вы сказали)\s*:/gi) || [];
      if (markers.length) return { count: markers.length, source: "conversation-markers" };
    }
    return { count: null, source: "unknown" };
  }

  function currentMessageStats() {
    const root = document.querySelector("main,[role='main']") || document.body;
    return countUserTurns(root);
  }

  function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
  function normTitle(value) { return cleanText(value).toLocaleLowerCase(); }
  function isJunkTitle(title) { return /^(skip to |перейти к )/i.test(cleanText(title)); }

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
    if (!isGoogleHost(location.hostname)) return false;
    if (isLikelyAiUrl(location.href)) return true;
    const title = (document.title || "").toLowerCase();
    if (title.includes("ai mode") || title.includes("режим ии") || title.includes("режим искусственного интеллекта")) return true;
    const activeMode = document.querySelector('[aria-current="page"],[aria-selected="true"]');
    const activeLabel = activeMode ? (activeMode.getAttribute("aria-label") || activeMode.innerText || activeMode.textContent || "").toLowerCase() : "";
    return activeLabel.includes("ai mode") || activeLabel.includes("режим ии");
  }

  function normalizeFolderList(list, depth, rawKeyToMigratedKey) {
    if (!Array.isArray(list) || depth > MAX_DEPTH) return [];
    return list.map((raw) => {
      const item = raw && typeof raw === "object" ? raw : {};
      const chatUrls = Array.isArray(item.chat_urls)
        ? Array.from(new Set(item.chat_urls.map((rawUrl) => {
            if (rawKeyToMigratedKey && rawKeyToMigratedKey.has(rawUrl)) return rawKeyToMigratedKey.get(rawUrl);
            return normalizeKey(rawUrl);
          }).filter(Boolean)))
        : [];
      return {
        id: typeof item.id === "string" ? item.id : makeId(),
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Новая папка",
        color: /^#[0-9a-f]{6}$/i.test(item.color || "") ? item.color : FOLDER_COLORS[0],
        children: normalizeFolderList(item.children, depth + 1, rawKeyToMigratedKey),
        chat_urls: chatUrls
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

  function titleForUrl(key) {
    if (typeof key === "string" && key.startsWith("t:")) return key.slice(2).slice(0, 140);
    const base = String(key || "").replace(/\|\d+$/, "");
    return (getQueryFromUrl(base) || "Чат Google AI").slice(0, 140);
  }

  function cleanChatItem(item, key, rawKey) {
    const src = item && typeof item === "object" ? item : {};
    return {
      title: typeof src.title === "string" && src.title.trim() ? src.title : titleForUrl(key),
      text: typeof src.text === "string" ? src.text.slice(0, MAX_INDEX_TEXT) : "",
      updatedAt: Number(src.updatedAt) || 0,
      url: typeof src.url === "string" && src.url ? src.url : (/^https:/.test(rawKey) ? rawKey : ""),
      threadId: typeof src.threadId === "string" ? src.threadId : "",
      order: Number.isFinite(src.order) ? src.order : null,
      missing: !!src.missing,
      missingScanCount: Number.isInteger(src.missingScanCount) && src.missingScanCount >= 0 ? src.missingScanCount : 0,
      missingSince: Number(src.missingSince) || 0,
      userMessageCount: Number.isInteger(src.userMessageCount) && src.userMessageCount >= 0 ? src.userMessageCount : null,
      countSource: typeof src.countSource === "string" ? src.countSource : "unknown",
      classification: src.classification === "single-turn" || src.classification === "multi-turn" ? src.classification : "unknown"
    };
  }

  function mergeChatItems(a, b) {
    const first = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
    const other = first === a ? b : a;
    return Object.assign({}, other, first, {
      text: first.text || other.text,
      url: first.url || other.url,
      threadId: first.threadId || other.threadId,
      order: first.order !== null ? first.order : other.order
    });
  }

  async function loadState() {
    const stored = await storageGet([FOLDERS_KEY, CHATS_KEY, UI_KEY]);
    if (stored[UI_KEY] && typeof stored[UI_KEY] === "object") {
      uiPrefs.open = stored[UI_KEY].open !== false;
      uiPrefs.diagHidden = !!stored[UI_KEY].diagHidden;
      uiPrefs.messageFilter = ["all", "single", "multi", "unknown"].includes(stored[UI_KEY].messageFilter)
        ? stored[UI_KEY].messageFilter : "all";
    }

    const chats = stored[CHATS_KEY] && typeof stored[CHATS_KEY] === "object" ? stored[CHATS_KEY] : {};
    const rawKeyToMigratedKey = new Map();
    state.chats = {};

    Object.keys(chats).forEach((rawKey) => {
      const normalized = normalizeKey(rawKey);
      if (!normalized) { rawKeyToMigratedKey.set(rawKey, null); return; }
      const item = cleanChatItem(chats[rawKey], normalized, rawKey);
      if (isJunkTitle(item.title)) { rawKeyToMigratedKey.set(rawKey, null); return; }

      let key = normalized;
      if (state.chats[key]) {
        const base = normalized.replace(/\|\d+$/, "");
        let suffix = 2;
        while (state.chats[base + "|" + suffix]) suffix += 1;
        key = base + "|" + suffix;
      }
      rawKeyToMigratedKey.set(rawKey, key);
      state.chats[key] = item;
    });

    state.folders = normalizeFolderList(stored[FOLDERS_KEY], 1, rawKeyToMigratedKey);
    collectAssignedUrls(state.folders).forEach((key) => {
      if (!state.chats[key] && !isJunkTitle(titleForUrl(key))) {
        state.chats[key] = cleanChatItem({}, key, key);
      }
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
    const cleanUrl = normalizeKey(url);
    if (!cleanUrl || !folder || !isStableChatKey(cleanUrl)) return;
    if (!state.chats[cleanUrl]) state.chats[cleanUrl] = { title: titleForUrl(cleanUrl), text: "", updatedAt: Date.now() };
    removeChatFromFolders(state.folders, cleanUrl);
    folder.chat_urls = folder.chat_urls || [];
    folder.chat_urls.push(cleanUrl);
    persist();
    render();
  }

  function getAllChatUrls() {
    const urls = new Set(
      Object.keys(state.chats).filter((key) => isStableChatKey(key) && !state.chats[key].missing && !isJunkTitle(state.chats[key].title))
    );
    collectAssignedUrls(state.folders).forEach((url) => {
      if (isStableChatKey(url) && state.chats[url] && !state.chats[url].missing) urls.add(url);
    });
    return Array.from(urls);
  }

  function exportChat(url) {
    const item = state.chats[url];
    if (!item || !item.text) {
      window.alert("Текст этой сессии ещё не проиндексирован. Откройте чат в Google AI Mode, чтобы расширение сохранило его текст, затем повторите экспорт.");
      return;
    }
    const title = item.title || titleForUrl(url);
    const output = "# " + title + "\n\nИсточник: " +
      (item.url || (/^https:/.test(url) ? url : "")) + "\n\n" + item.text + "\n";
    const blob = new Blob(["\uFEFF", output], { type: "text/markdown;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = title.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 70) || "google-ai-chat";
    link.href = objectUrl;
    link.download = safeName + ".md";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }

  function createChatRow(url) {
    if (!isStableChatKey(url) || !state.chats[url]) return createElement("div", "empty-note", "Диалог пока не идентифицирован.");
    const key = url;
    const item = state.chats[key];
    const row = createElement("div", key === currentKey ? "chat-row current" : "chat-row");
    const link = createElement("a", "chat-link", item.title || titleForUrl(key));
    link.href = item.url || "#";
    link.title = item.title || key;
    link.draggable = true;
    if (!item.text) link.classList.add("not-indexed");
    if (item.missing) link.classList.add("missing");
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      openChat(key);
    });
    link.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/x-google-ai-chat-key", key);
      event.dataTransfer.setData("text/plain", key);
    });
    row.appendChild(link);
    const actions = createElement("div", "chat-actions");
    const count = Number.isInteger(item.userMessageCount) ? item.userMessageCount : null;
    const countBadge = createElement("span", "message-count", count === null ? "?" : String(count));
    countBadge.title = count === null
      ? "Количество реплик ещё не определено"
      : count + (count === 1 ? " реплика пользователя" : " реплик пользователя");
    row.appendChild(countBadge);
    actions.appendChild(createButton("MD", "Экспортировать в Markdown", () => exportChat(key), "export-button"));
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
      let key = event.dataTransfer.getData("text/x-google-ai-chat-key") || "";
      if (!key) key = normalizeKey((event.dataTransfer.getData("text/plain") || "").split(/\r?\n/)[0].trim()) || "";
      if (!key || !state.chats[key]) {
        setStatus("Перетащите сюда чат из списка органайзера.");
        return;
      }
      assignChat(key, folder);
    });
  }

  function countNestedChats(folders) {
    let count = 0;
    (folders || []).forEach((folder) => {
      count += (folder.chat_urls || []).length + countNestedChats(folder.children || []);
    });
    return count;
  }

  function renderSearchResults(query) {
    const normalized = query.toLocaleLowerCase();
    const matching = getAllChatUrls().map((url) => {
      const item = state.chats[url] || { title: titleForUrl(url), text: "" };
      const source = (item.title + "\n" + item.text + "\n" + url).toLocaleLowerCase();
      return { url: url, item: item, matched: source.includes(normalized) && isChatVisibleForFilter(url) };
    }).filter((entry) => entry.matched);
    ui.tree.appendChild(createElement("div", "search-caption", "Найдено: " + matching.length));
    if (!matching.length) {
      ui.tree.appendChild(createElement("div", "empty-note", "Совпадений нет или реплики ещё не рассчитаны."));
      return;
    }
    matching.sort((a, b) => (b.item.updatedAt || 0) - (a.item.updatedAt || 0));
    matching.forEach((entry) => ui.tree.appendChild(createChatRow(entry.url)));
  }

  function renderFolder(folder, depth) {
    const direct = (folder.chat_urls || []).filter((url) =>
      isStableChatKey(url) && state.chats[url] && !state.chats[url].missing && isChatVisibleForFilter(url)
    );
    const nested = (folder.children || []).map((child) => renderFolder(child, depth + 1)).filter(Boolean);
    if (uiPrefs.messageFilter !== "all" && direct.length === 0 && nested.length === 0) return null;

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
    const count = direct.length + nested.reduce((sum, node) => sum + Number(node.dataset.visibleCount || 0), 0);
    const badge = createElement("span", "folder-count", String(count));
    const actions = createElement("span", "folder-actions");

    if (depth < MAX_DEPTH) actions.appendChild(createButton("+", "Создать подпапку", () => addFolder(folder.id)));
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
    direct.forEach((url) => {
      const row = createChatRow(url);
      if (row) children.appendChild(row);
    });
    nested.forEach((node) => children.appendChild(node));
    if (!children.childElementCount) children.appendChild(createElement("div", "empty-note", "Пока нет подтверждённых диалогов."));
    details.appendChild(children);
    details.dataset.visibleCount = String(count);
    return details;
  }

  function render() {
    if (!ui || !ui.tree) return;
    ui.tree.replaceChildren();
    const query = ui.search.value.trim();
    if (query) {
      renderSearchResults(query);
    } else {
      state.folders.forEach((folder) => {
        const node = renderFolder(folder, 1);
        if (node) ui.tree.appendChild(node);
      });
      const assigned = new Set(collectAssignedUrls(state.folders).filter(isStableChatKey));
      const unassigned = getAllChatUrls().filter((url) =>
        !assigned.has(url) && !state.chats[url].missing && isChatVisibleForFilter(url)
      );
      const recent = createElement("details", "folder unassigned");
      recent.open = true;
      const summary = createElement("summary", "folder-summary");
      summary.append(createElement("span", "folder-marker neutral-marker"));
      summary.append(createElement("span", "folder-name", "Без папки"));
      summary.append(createElement("span", "folder-count", String(unassigned.length)));
      recent.appendChild(summary);
      const contents = createElement("div", "folder-contents");
      unassigned.sort((a, b) => {
        const ia = state.chats[a] || {}; const ib = state.chats[b] || {};
        const oa = Number.isFinite(ia.order) ? ia.order : 1e9;
        const ob = Number.isFinite(ib.order) ? ib.order : 1e9;
        return oa - ob || (ib.updatedAt || 0) - (ia.updatedAt || 0);
      });
      unassigned.forEach((url) => contents.appendChild(createChatRow(url)));
      if (!unassigned.length) contents.appendChild(createElement("div", "empty-note", "Нет диалогов для выбранного фильтра."));
      recent.appendChild(contents);
      ui.tree.appendChild(recent);

    const all = getAllChatUrls();
    const indexed = all.filter((url) => state.chats[url] && state.chats[url].text).length;
    const oneTurn = all.filter((url) => state.chats[url].userMessageCount === 1).length;
    const multiTurn = all.filter((url) => Number.isInteger(state.chats[url].userMessageCount) && state.chats[url].userMessageCount >= 2).length;
    const unknown = all.filter((url) => !Number.isInteger(state.chats[url].userMessageCount)).length;
    const unverified = Object.keys(state.chats).filter((key) => !isStableChatKey(key)).length;
    setStatus(all.length + " диалогов · 1 реплика: " + oneTurn + " · 2+: " + multiTurn +
      " · не рассчитано: " + unknown + " · без ID скрыто: " + unverified + " · проиндексировано: " + indexed);
  }

  function createInterface() {
    host = document.createElement("div");
    host.id = "google-search-ai-chat-organizer";
    // The organizer is a fixed overlay laid exactly over Google's own "Recent" box,
    // so it never depends on (or disturbs) Google's flex/grid layout.
    host.style.cssText = "position:fixed;z-index:" + HOST_Z_INDEX + ";display:none;box-sizing:border-box;margin:0;padding:0;overflow:hidden;border-radius:12px;";
    shadow = host.attachShadow({ mode: "open" });

    const style = createElement("style");
    style.textContent = [
      ":host { all: initial; display:block; font-family:Arial,sans-serif; }",
      "* { box-sizing:border-box; } [hidden] { display:none !important; }",
      ".wrap { height:100%; color-scheme:light; --gsaco-text:#202124; --gsaco-bg:#fff; --gsaco-border:#dadce0; --gsaco-muted:#5f6368; --gsaco-input:#fff; --gsaco-hover:#f1f3f4; --gsaco-link:#1a73e8; }",
      ".wrap.dark { color-scheme:dark; --gsaco-text:#e8eaed; --gsaco-bg:#202124; --gsaco-border:#5f6368; --gsaco-muted:#bdc1c6; --gsaco-input:#292a2d; --gsaco-hover:#303134; --gsaco-link:#8ab4f8; }",
      ".panel { display:flex; flex-direction:column; height:100%; color:var(--gsaco-text); background:var(--gsaco-bg); border:1px solid var(--gsaco-border); border-radius:12px; padding:10px; font:13px/1.4 Arial,sans-serif; min-width:0; }",
      ".bar { display:block; width:100%; height:34px; color:var(--gsaco-text); background:var(--gsaco-bg); border:1px solid var(--gsaco-border); border-radius:10px; font:12px Arial,sans-serif; cursor:pointer; }",
      ".header { flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:9px; }",
      ".brand { min-width:0; } .brand strong { display:block; font-size:13px; font-weight:700; } .brand small { display:block; color:var(--gsaco-muted); font-size:10px; }",
      ".header-actions { display:flex; align-items:center; gap:4px; }",
      "button { font:inherit; cursor:pointer; } .primary { border:0; border-radius:8px; padding:6px 9px; background:#1a73e8; color:white; font-weight:600; white-space:nowrap; } .primary:hover { background:#1765cc; }",
      ".search-wrap { flex:0 0 auto; display:flex; align-items:center; gap:7px; border:1px solid var(--gsaco-border); border-radius:8px; padding:0 8px; margin:0 0 8px; background:var(--gsaco-input); }",
      ".search-icon { color:var(--gsaco-muted); font-size:16px; } input { min-width:0; width:100%; height:32px; border:0; outline:0; background:transparent; color:inherit; font:inherit; }",
      ".filter-wrap { display:flex; align-items:center; gap:6px; margin:0 0 8px; color:var(--gsaco-muted); font-size:10px; } .filter-wrap select { flex:1; min-width:0; height:29px; border:1px solid var(--gsaco-border); border-radius:7px; padding:0 6px; color:var(--gsaco-text); background:var(--gsaco-input); font:11px Arial,sans-serif; }",
      ".message-count { flex:0 0 auto; color:var(--gsaco-muted); font-size:9px; min-width:13px; text-align:center; }",
      ".tree { flex:1 1 auto; min-height:0; overflow:auto; overscroll-behavior:contain; } details { min-width:0; } .folder { margin:2px 0; border-radius:7px; }",
      ".folder-summary { list-style:none; display:flex; align-items:center; gap:6px; min-height:31px; padding:4px 5px; border-radius:7px; cursor:pointer; user-select:none; } .folder-summary::-webkit-details-marker { display:none; }",
      ".folder-summary::before { content:'›'; display:inline-block; width:9px; color:var(--gsaco-muted); transition:transform .12s ease; } details[open] > .folder-summary::before { transform:rotate(90deg); }",
      ".folder-marker { flex:0 0 9px; width:9px; height:9px; border-radius:3px; } .neutral-marker { background:#9aa0a6; }",
      ".folder-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; } .folder-count { color:var(--gsaco-muted); font-size:10px; }",
      ".folder-actions { display:flex; align-items:center; gap:1px; opacity:.75; } .mini-button { border:0; color:var(--gsaco-muted); background:transparent; border-radius:5px; min-width:21px; height:21px; padding:0 4px; font-size:13px; }",
      ".mini-button:hover,.export-button:hover { background:var(--gsaco-hover); color:var(--gsaco-text); } .folder-contents { margin-left:13px; padding-left:8px; border-left:1px solid var(--gsaco-border); }",
      ".chat-row { display:flex; align-items:center; gap:4px; min-width:0; padding:4px 3px 4px 5px; border-radius:6px; } .chat-row:hover { background:var(--gsaco-hover); } .chat-row.current { background:var(--gsaco-hover); box-shadow:inset 2px 0 0 #1a73e8; }",
      ".chat-link { flex:1; min-width:0; color:var(--gsaco-link); text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; } .chat-link:hover { text-decoration:underline; } .chat-link.not-indexed { color:var(--gsaco-text); } .chat-link.missing { opacity:.55; font-style:italic; }",
      ".chat-actions { display:flex; gap:2px; flex:0 0 auto; } .export-button { border:1px solid transparent; border-radius:4px; background:transparent; color:var(--gsaco-muted); padding:2px 3px; font-size:9px; }",
      ".empty-note,.search-caption { color:var(--gsaco-muted); font-size:11px; padding:7px 6px; } .search-caption { font-weight:600; }",
      ".status { flex:0 0 auto; border-top:1px solid var(--gsaco-border); margin-top:8px; padding-top:7px; font-size:10px; color:var(--gsaco-muted); }",
      ".drop-target > .folder-summary,.drop-target { background:rgba(26,115,232,.10); outline:1px dashed #1a73e8; outline-offset:-1px; }"
    ].join("\n");
    shadow.appendChild(style);

    const wrap = createElement("div", "wrap");
    const panel = createElement("section", "panel");
    const header = createElement("div", "header");
    const brand = createElement("div", "brand");
    brand.append(createElement("strong", "", "AI Chat Organizer"));
    brand.append(createElement("small", "", "Папки для поисковых AI-диалогов"));
    const headerActions = createElement("div", "header-actions");
    headerActions.append(
      createButton("+ Папка", "Создать папку верхнего уровня", () => addFolder(), "primary"),
      createButton("⌃", "Свернуть органайзер и показать родной список Google", () => setOpen(false))
    );
    header.append(brand, headerActions);

    const searchWrap = createElement("label", "search-wrap");
    searchWrap.appendChild(createElement("span", "search-icon", "⌕"));
    const search = createElement("input");
    search.type = "search";
    search.placeholder = "Поиск по названиям и тексту чатов";
    search.setAttribute("aria-label", "Поиск по AI-чатам");
    search.addEventListener("input", render);
    searchWrap.appendChild(search);

    const filterWrap = createElement("label", "filter-wrap");
    filterWrap.appendChild(createElement("span", "", "Реплики"));
    const filter = createElement("select");
    filter.setAttribute("aria-label", "Фильтр по количеству реплик пользователя");
    [
      ["all", "Все диалоги"],
      ["multi", "2+ реплики"],
      ["single", "1 реплика"],
      ["unknown", "Не рассчитано"]
    ].forEach(([value, label]) => {
      const option = createElement("option", "", label);
      option.value = value;
      filter.appendChild(option);
    });
    filter.value = uiPrefs.messageFilter;
    filter.addEventListener("change", () => {
      uiPrefs.messageFilter = filter.value;
      saveUiPrefs();
      render();
    });
    filterWrap.appendChild(filter);

    const tree = createElement("div", "tree");
    const status = createElement("div", "status");
    panel.append(header, searchWrap, filterWrap, tree, status);
    const bar = createButton("⌄ Папки AI-чатов — открыть органайзер", "Развернуть органайзер вместо списка Google", () => setOpen(true), "bar");
    bar.hidden = true;
    wrap.append(panel, bar);
    shadow.appendChild(wrap);
    ui = { wrap: wrap, panel: panel, bar: bar, tree: tree, status: status, search: search, filter: filter };
    render();
  }

  // ===================== Detection of Google's native history =====================

  function isRecentLabel(element) {
    if (!element || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    // No viewport check: the heading may be scrolled out of view while the list is primed.
    if (rect.width < 8 || rect.height < 8) return false;
    const renderedText = cleanText(element.textContent);
    const ariaText = cleanText(element.getAttribute("aria-label"));
    return [renderedText, ariaText].filter(Boolean).some((label) => label.length <= 48 && RECENT_LABEL.test(label));
  }

  function findRecentLabel() {
    const labels = Array.from(document.querySelectorAll("h1,h2,h3,button,[role='heading'],[role='button']"))
      .filter((el) => isRecentLabel(el) && el.getBoundingClientRect().left < 420);
    const area = (el) => { const r = el.getBoundingClientRect(); return r.width * r.height; };
    labels.sort((a, b) => area(b) - area(a));
    return labels[0] || null;
  }

  function findScroller(from) {
    let node = from.parentElement;
    for (let depth = 0; depth < 16 && node && node !== document.body; depth += 1, node = node.parentElement) {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const isLeftRail = rect.width >= 150 && rect.width <= 460 &&
        rect.left >= -80 && rect.left <= 360 &&
        rect.height >= 100 && rect.height <= 1600;
      if (isLeftRail && /(auto|scroll|overlay)/.test(style.overflowY || "") &&
          node.scrollHeight > node.clientHeight + 20) return node;
    }
    return null;
  }

  function containsNavLabel(root) {
    const nodes = root.querySelectorAll("a,button,[role='button'],[role='link'],[role='menuitem']");
    for (let i = 0; i < Math.min(nodes.length, 80); i += 1) {
      if (NAV_LABELS.has(normTitle(nodes[i].getAttribute("aria-label") || nodes[i].textContent))) return true;
    }
    return false;
  }

  // Region = the exact box Google uses for "Recent": the organizer is laid over it.
  function findHistoryRegion(heading) {
    const scroller = findScroller(heading);
    let region = scroller || heading.parentElement;
    let node = scroller ? scroller.parentElement : heading.parentElement;

    // Use the nearest scroller for lazy loading, but let the overlay cover a
    // bounded enclosing history box when Google separates the header and list.
    for (let depth = 0; depth < 8 && node && node !== document.body; depth += 1, node = node.parentElement) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 460 || rect.left > 360 || rect.left < -120 || containsNavLabel(node)) break;
      const boundedHistoryBox = rect.width >= 150 && rect.height >= 100 &&
        rect.width <= 460 && rect.height <= 1600;
      if (boundedHistoryBox && node.contains(heading) && (!scroller || node.contains(scroller))) region = node;
    }
    return { region: region, scroller: scroller };
  }

  function rowTitle(el) {
    let lines = String(el.innerText || el.textContent || "").split(/\n+/)
      .map((line) => cleanText(line).replace(/^[a-z][a-z_]{2,39}(?=[^a-z_\s])/, ""))
      .filter(Boolean);
    if (lines.length > 1) {
      const filtered = lines.filter((line) => !/^[a-z][a-z_]{2,39}$/.test(line));
      if (filtered.length) lines = filtered;
    }
    return (lines[0] || cleanText(el.getAttribute("aria-label"))).slice(0, 180);
  }

  // Only explicit Google conversation IDs or URLs containing a thread identity are eligible.
  function detectRows(root, heading) {
    if (!root) return [];
    const selector = [
      "button[data-thread-id]",
      "button[data-session-thread-id]",
      "button[data-conversation-id]",
      "button[data-chat-id]",
      "button[data-session-id]",
      "[role='button'][data-thread-id]",
      "[role='button'][data-session-thread-id]",
      "[role='button'][data-conversation-id]",
      "[data-session-thread-id]",
      "[data-thread-id]",
      "[data-conversation-id]",
      "a[href]"
    ].join(",");
    const nodes = Array.from(root.querySelectorAll(selector));
    const accepted = [];
    nodes.forEach((node) => {
      if (node === heading || node.contains(heading) || heading.contains(node)) return;
      let candidate = node;
      if (!candidate.matches("button,a,[role='button'],[role='link']")) {
        candidate = node.closest("button,a,[role='button'],[role='link']") || node;
      }
      if (!root.contains(candidate) || candidate === heading || candidate.contains(heading)) return;
      if (accepted.some((existing) => existing === candidate || existing.contains(candidate))) return;
      const rect = candidate.getBoundingClientRect();
      if (rect.width < 100 || rect.width > 460 || rect.height < 20 || rect.height > 90) return;
      const title = rowTitle(candidate);
      if (!title || title.length < 2 || NAV_LABELS.has(normTitle(title)) || NOISE_ROW.test(title) ||
          RECENT_LABEL.test(title) || isJunkTitle(title)) return;
      const row = describeRow(candidate);
      if (row.key) accepted.push(candidate);
    });
    return accepted;
  }

  function countUnclassifiedRows(root, heading) {
    if (!root) return 0;
    const candidates = Array.from(root.querySelectorAll(CLICKABLE));
    let count = 0;
    const counted = [];
    candidates.forEach((node) => {
      if (node === heading || node.contains(heading) || heading.contains(node)) return;
      if (counted.some((existing) => existing === node || existing.contains(node))) return;
      const rect = node.getBoundingClientRect();
      if (rect.width < 100 || rect.width > 460 || rect.height < 20 || rect.height > 90) return;
      const title = rowTitle(node);
      if (!title || title.length < 2 || NAV_LABELS.has(normTitle(title)) || NOISE_ROW.test(title) ||
          RECENT_LABEL.test(title) || isJunkTitle(title)) return;
      const row = describeRow(node);
      if (!row.key) { counted.push(node); count += 1; }
    });
    return count;
  }

  function attributeId(el) {
    const names = [
      "data-session-thread-id",
      "data-thread-id",
      "data-conversation-id",
      "data-chat-id",
      "data-session-id",
      "data-mtid"
    ];
    const selector = names.map((name) => "[" + name + "]").join(",");
    const nodes = [el].concat(Array.from(el.querySelectorAll(selector)).slice(0, 8));
    for (const node of nodes) {
      for (const name of names) {
        const value = cleanText(node.getAttribute(name));
        if (value.length >= 4 && value.length <= 200 && /^[A-Za-z0-9._:-]+$/.test(value) &&
            !/^(true|false|null|undefined)$/i.test(value)) return value;
      }
    }
    return "";
  }

  function describeRow(el) {
    const title = rowTitle(el);
    const anchor = el.matches("a[href]") ? el : el.querySelector("a[href]");
    let href = "";
    let urlKey = null;
    if (anchor) {
      try {
        const url = new URL(anchor.getAttribute("href"), location.href);
        if (!url.hash && url.protocol === "https:" && isGoogleHost(url.hostname)) {
          urlKey = toStableThreadKey(url.href);
          if (urlKey) href = url.href;
        } else {
          urlKey = toStableThreadKey(url.href);
          if (urlKey) href = url.href;
        }
      } catch (_error) {}
    }

    const id = attributeId(el);
    const threadId = id || (urlKey ? urlKey.slice(3) : "");
    const base = id ? "id:" + id : urlKey;
    return {
      el: el, title: title, href: href, urlKey: urlKey, threadId: threadId,
      base: base, hasUrl: !!urlKey, hasId: !!id, key: base
    };
  }

  function scanHistory() {
    const heading = findRecentLabel();
    if (!heading) return null;
    const found = findHistoryRegion(heading);
    const elements = detectRows(found.region, heading);
    const rows = elements.map(describeRow).filter((row) => row.key && isStableChatKey(row.key));
    const seen = new Set();
    const uniqueRows = rows.filter((row) => {
      if (seen.has(row.key)) return false;
      seen.add(row.key);
      return true;
    });
    return {
      heading: heading, region: found.region, scroller: found.scroller,
      rows: uniqueRows, unclassifiedCount: countUnclassifiedRows(found.region, heading),
      complete: !found.scroller || completeScrollers.has(found.scroller)
    };
  }

  function renameKeyInFolders(folders, from, to) {
    (folders || []).forEach((folder) => {
      folder.chat_urls = Array.from(new Set((folder.chat_urls || []).map((k) => (k === from ? to : k))));
      renameKeyInFolders(folder.children || [], from, to);
    });
  }

  function applyScan(scan) {
    const now = Date.now();
    const entries = state.chats;
    const scanKeys = new Set(scan.rows.map((row) => row.key));
    let changed = false;

    scan.rows.forEach((row, index) => {
      if (!isStableChatKey(row.key)) return;
      let item = entries[row.key];
      if (!item) {
        const candidates = Object.keys(entries).filter((key) => key !== row.key && isStableChatKey(key));
        const matchingThread = candidates.filter((key) =>
          (entries[key].threadId && entries[key].threadId === row.threadId) ||
          toStableThreadKey(entries[key].url || key) === row.key
        );
        const oldKey = matchingThread.length === 1 ? matchingThread[0] : null;
        if (oldKey) {
          item = entries[oldKey];
          delete entries[oldKey];
          entries[row.key] = item;
          renameKeyInFolders(state.folders, oldKey, row.key);
        } else {
          item = {
            title: row.title, text: "", updatedAt: now, url: row.href,
            threadId: row.threadId || "", order: index, missing: false, missingScanCount: 0,
            userMessageCount: null, countSource: "unknown", classification: "unknown"
          };
          entries[row.key] = item;
        }
        changed = true;
      }

      if (item.title !== row.title || item.order !== index || item.missing || item.missingScanCount || item.missingSince ||
          (row.href && item.url !== row.href) || (row.threadId && item.threadId !== row.threadId)) changed = true;
      item.title = row.title;
      item.order = index;
      item.missing = false;
      item.missingScanCount = 0;
      item.missingSince = 0;
      if (row.href) item.url = row.href;
      if (row.threadId) item.threadId = row.threadId;
    });

    // A deleted Google conversation is removed from local cache and folder bindings
    // only after two consecutive complete scans that contain no unclassified rows.
    if (scan.complete && scan.rows.length > 0 && scan.unclassifiedCount === 0) {
      Object.keys(entries).forEach((key) => {
        if (!isStableChatKey(key) || scanKeys.has(key)) return;
        const item = entries[key];
        const firstMissingAt = Number(item.missingSince) || 0;
        if (!firstMissingAt) {
          item.missing = true;
          item.missingScanCount = 1;
          item.missingSince = now;
          changed = true;
        } else if (now - firstMissingAt >= 2200) {
          removeChatFromFolders(state.folders, key);
          delete entries[key];
          changed = true;
        }
      });
    } else {
      // A partial/unknown/empty scan breaks the deletion-confirmation sequence.
      Object.keys(entries).forEach((key) => {
        const item = entries[key];
        if (!isStableChatKey(key) || !item.missing) return;
        if (item.missingScanCount || item.missingSince) {
          item.missingScanCount = 0;
          item.missingSince = 0;
          changed = true;
        }
      });
    }
    return changed;
  }

  function findNativeRow(key) {
    if (!isStableChatKey(key)) return null;
    const live = lastScan && lastScan.rows.find((row) => row.key === key && row.el.isConnected);
    if (live) return live.el;
    const fresh = scanHistory();
    if (!fresh) return null;
    const match = fresh.rows.find((row) => row.key === key);
    return match ? match.el : null;
  }

  function clickNative(row) {
    const anchor = row.matches("a[href]") ? row : row.querySelector("a[href]");
    if (anchor) { anchor.click(); return; }
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
      row.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
    });
  }

  function openChat(key) {
    const item = state.chats[key] || {};
    const row = findNativeRow(key);
    if (row) { clickNative(row); return; }
    if (item.url) { location.assign(item.url); return; }
    setStatus("Этого чата сейчас нет в списке «Недавнее» Google. Раскройте «Недавнее» и повторите.");
  }

  // ===================== Overlay layout =====================

  function detectBackground(el) {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const m = /rgba?\(([^)]+)\)/.exec(window.getComputedStyle(node).backgroundColor || "");
      if (!m) continue;
      const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && (p.length < 4 || p[3] >= 0.9)) {
        const lum = (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
        return { css: "rgb(" + p[0] + "," + p[1] + "," + p[2] + ")", dark: lum < 0.45 };
      }
    }
    return null;
  }

  function ensureInterface() {
    if (!host) createInterface();
    if (!host.isConnected) (document.body || document.documentElement).appendChild(host);
  }

  function canReplaceNativeHistory(scan) {
    return !!(scan && scan.complete && scan.rows.length > 0 && scan.unclassifiedCount === 0);
  }

  function positionHost() {
    if (!host || !ui || !region || !region.isConnected) return false;
    if (!canReplaceNativeHistory(lastScan)) {
      host.style.display = "none";
      return false;
    }
    const r = region.getBoundingClientRect();
    if (r.width < 150 || r.height < 100 || r.width > 460 || r.left > 360) {
      host.style.display = "none";
      return false;
    }

    const open = uiPrefs.open;
    const height = open ? r.height : 34;
    host.style.display = "block";
    host.style.left = Math.round(r.left) + "px";
    host.style.width = Math.round(r.width) + "px";
    host.style.top = Math.round(open ? r.top : r.bottom - height) + "px";
    host.style.height = Math.round(height) + "px";

    const bg = detectBackground(region);
    const dark = bg ? bg.dark : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    ui.wrap.classList.toggle("dark", dark);
    host.style.background = open && bg ? bg.css : "transparent";
    ui.panel.hidden = !open;
    ui.bar.hidden = open;
    return true;
  }

  function setNativeHidden(hide) {
    const target = hide && region && region.isConnected ? region : null;
    if (nativeHidden && nativeHidden.el !== target) {
      const saved = nativeHidden;
      if (saved.el.isConnected) {
        if (saved.value) saved.el.style.setProperty("visibility", saved.value, saved.priority);
        else saved.el.style.removeProperty("visibility");
      }
      nativeHidden = null;
    }
    if (target && !nativeHidden) {
      nativeHidden = { el: target, value: target.style.getPropertyValue("visibility"), priority: target.style.getPropertyPriority("visibility") };
      target.style.setProperty("visibility", "hidden", "important");
    }
  }

  function setOpen(value) {
    uiPrefs.open = !!value;
    saveUiPrefs();
    const positioned = positionHost();
    setNativeHidden(uiPrefs.open && canReplaceNativeHistory(lastScan) && positioned);
  }

  function teardown() {
    setNativeHidden(false);
    if (host) host.remove();
    host = null; shadow = null; ui = null; region = null; lastScan = null;
  }

  // ===================== Priming lazy-loaded history =====================

  function finishPriming(scroller, progress, stable) {
    if (scroller.isConnected) scroller.scrollTop = progress.initialScrollTop;
    if (stable) completeScrollers.add(scroller);
    else primedScrollers.delete(scroller);   // try again on a later scan
    activePriming = null;
    scheduleScan();
  }

  function stepPriming(scroller, heading, progress) {
    if (!scroller.isConnected) { finishPriming(scroller, progress, false); return; }
    scroller.scrollTop = scroller.scrollHeight;
    progress.steps += 1;
    window.setTimeout(() => {
      const count = detectRows(scroller, heading).length;
      if (count > progress.previousCount) { progress.previousCount = count; progress.stableSteps = 0; }
      else progress.stableSteps += 1;
      if (progress.stableSteps >= 4) finishPriming(scroller, progress, true);
      else if (progress.steps >= 80) finishPriming(scroller, progress, false);
      else stepPriming(scroller, heading, progress);
    }, 300);
  }

  function startPriming(scan) {
    const scroller = scan.scroller;
    if (!scroller || primedScrollers.has(scroller) || completeScrollers.has(scroller) || activePriming) return;
    primedScrollers.add(scroller);
    activePriming = scroller;
    stepPriming(scroller, scan.heading, { initialScrollTop: scroller.scrollTop, previousCount: scan.rows.length, stableSteps: 0, steps: 0 });
  }

  // ===================== Diagnostics =====================

  function saveUiPrefs() {
    const value = {};
    value[UI_KEY] = { open: uiPrefs.open, diagHidden: uiPrefs.diagHidden, messageFilter: uiPrefs.messageFilter };
    storageQueue = storageQueue.then(() => storageSet(value)).catch(() => {});
  }

  function removeDetectionDiagnostic() {
    if (diagnosticHost) diagnosticHost.remove();
    diagnosticHost = null;
    diagnosticInfo = null;
  }

  function isOwnNode(node) {
    return !!node && ((diagnosticHost && (node === diagnosticHost || diagnosticHost.contains(node))) ||
      (host && (node === host || host.contains(node))));
  }

  function isOwnMutation(mutation) {
    if (isOwnNode(mutation.target)) return true;
    if (mutation.type === "childList") {
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return nodes.length > 0 && nodes.every(isOwnNode);
    }
    return false;
  }

  function describeNode(el) {
    const r = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const attrs = Array.from(el.attributes).map((a) => a.name).filter((n) => n !== "class" && n !== "style").slice(0, 12).join(",");
    const role = el.getAttribute("role");
    return el.tagName.toLowerCase() + (role ? "[role=" + role + "]" : "") + " attrs=" + attrs +
      " w=" + Math.round(r.width) + " h=" + Math.round(r.height) + " cursor=" + cs.cursor +
      " overflowY=" + cs.overflowY + " textLen=" + cleanText(el.textContent).length;
  }

  // Anonymised outline (no titles, no query values) to send back for debugging.
  function buildSnapshot(scan) {
    const lines = ["--- DOM snapshot (v" + VERSION + ") ---"];
    if (scan) {
      lines.push("Цепочка предков заголовка:");
      let node = scan.heading;
      for (let i = 0; i < 9 && node && node !== document.body; i += 1, node = node.parentElement) {
        lines.push("  " + describeNode(node));
      }
      lines.push("Подтверждённые строки: " + scan.rows.length + " · не классифицировано: " + scan.unclassifiedCount);
      scan.rows.slice(0, 5).forEach((row, index) => {
        lines.push("Строка " + (index + 1) + ": " + describeNode(row.el) +
          " identity=" + (row.hasId ? "data-id" : "thread-url") + " · titleLen=" + row.title.length);
      });
    }
    const main = document.querySelector("main,[role='main']");
    if (main) {
      lines.push("Структура открытой сессии (без текста):");
      const selector = [
        "[data-message-author-role]",
        "[data-message-author]",
        "[data-role]",
        "user-query",
        "model-response",
        "response-container"
      ].join(",");
      const messages = Array.from(main.querySelectorAll(selector)).slice(0, 80);
      lines.push("Найдено узлов с признаками роли: " + messages.length);
      messages.forEach((el, index) => {
        const role = el.getAttribute("data-message-author-role") ||
          el.getAttribute("data-message-author") || el.getAttribute("data-role") || el.tagName.toLowerCase();
        lines.push("  #" + (index + 1) + " role=" + role + " " + describeNode(el));
      });
      const stats = countUserTurns(main);
      lines.push("Реплик пользователя: " + (stats.count === null ? "не определено" : stats.count) + " · источник: " + stats.source);
      const text = String(main.innerText || main.textContent || "");
      lines.push("Маркер AI Mode Conversation: " + (/AI Mode Conversation:/i.test(text) ? "есть" : "нет"));
      lines.push("Маркер You said: " + (/(?:^|\n)\s*(?:You said|Вы сказали)\s*:/i.test(text) ? "есть" : "нет"));
    } else {
      lines.push("Открытая сессия: main не найден");
    }
    const thread = document.querySelector("main [data-session-thread-id],main [data-thread-id],main [data-conversation-id]");
    lines.push("ID в содержимом страницы: " + (thread ? "есть" : "нет"));
    return lines.join("\n");
  }

  function buildDiagnosticText(scan) {
    const rows = scan ? scan.rows : [];
    const keys = getAllChatUrls();
    const oneTurn = keys.filter((key) => state.chats[key].userMessageCount === 1).length;
    const multiTurn = keys.filter((key) => Number.isInteger(state.chats[key].userMessageCount) && state.chats[key].userMessageCount >= 2).length;
    const unknownCount = keys.filter((key) => !Number.isInteger(state.chats[key].userMessageCount)).length;
    const unverified = Object.keys(state.chats).filter((key) => !isStableChatKey(key)).length;
    const lines = [
      "Версия " + VERSION + " · скрипт ЗАГРУЖЕН",
      "Страница: " + location.pathname + " · " + location.hostname + " · AI-страница: " + (isCurrentAiPage() ? "да" : "нет"),
      "Ширина viewport: " + Math.round(Math.max(document.documentElement.clientWidth, window.innerWidth || 0)) + " CSS px"
    ];
    if (scan) {
      const hr = scan.heading.getBoundingClientRect();
      const rr = scan.region.getBoundingClientRect();
      lines.push("Заголовок «Недавнее»: НАЙДЕН x=" + Math.round(hr.left) + " y=" + Math.round(hr.top));
      lines.push("Область истории: " + scan.region.tagName.toLowerCase() + " x=" + Math.round(rr.left) + " w=" + Math.round(rr.width) +
        " h=" + Math.round(rr.height) + (scan.scroller ? " · прокрутка " + scan.scroller.scrollHeight + "/" + scan.scroller.clientHeight : " · без прокрутки"));
      lines.push("Подтверждённых диалогов: " + rows.length + " · без thread ID: " + scan.unclassifiedCount);
      lines.push("Список загружен полностью: " + (scan.complete ? "да" : "нет") + (activePriming ? " · идёт подгрузка…" : ""));
    } else {
      lines.push("Заголовок «Недавнее»: НЕ НАЙДЕН");
    }
    const stats = currentMessageStats();
    lines.push("Текущая сессия: " + (stats.count === null ? "реплики не определены" : stats.count + " репл. пользователя") + " · источник: " + stats.source);
    lines.push("В базе: " + keys.length + " подтверждённых · 1 реплика: " + oneTurn + " · 2+: " + multiTurn + " · не рассчитано: " + unknownCount);
    lines.push("Скрыто неподтверждённых локальных записей: " + unverified);
    lines.push("Органайзер: " + (host && host.isConnected ? (uiPrefs.open ? "заменяет список" : "свёрнут") : "НЕ ВСТАВЛЕН") +
      " · родной список скрыт: " + (nativeHidden ? "да" : "нет"));
    return lines.join("\n");
  }

  function copyText(text, button) {
    const done = (ok) => { button.textContent = ok ? "Скопировано" : "Выделите текст"; window.setTimeout(() => { button.textContent = button.dataset.label; }, 1500); };
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error("no clipboard"))).then(() => done(true), () => {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.style.cssText = "position:fixed;left:-10000px;top:0";
      document.body.appendChild(temp);
      temp.select();
      const ok = document.execCommand("copy");
      temp.remove();
      done(ok);
    });
  }

  function updateDetectionDiagnostic(scan) {
    if (!isGoogleHost(location.hostname) || location.pathname !== "/search" || uiPrefs.diagHidden) { removeDetectionDiagnostic(); return; }
    if (!diagnosticHost || !diagnosticHost.isConnected) {
      diagnosticHost = document.createElement("div");
      diagnosticHost.id = "gsaco-detection-diagnostic";
      diagnosticHost.style.cssText = "position:fixed;top:76px;right:12px;z-index:2147483647;width:min(380px,calc(100vw - 24px));max-height:42vh;box-sizing:border-box;pointer-events:auto;";
      const root = diagnosticHost.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = ":host{all:initial;pointer-events:auto}section{font:12px/1.4 Arial,sans-serif;background:#202124;color:#e8eaed;border:1px solid #fbbc04;border-radius:9px;box-shadow:0 3px 16px #0008;padding:10px;max-height:42vh;overflow:auto}header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}strong{color:#fbbc04;font-size:12px}button{font:11px Arial,sans-serif;color:#e8eaed;background:#3c4043;border:1px solid #5f6368;border-radius:5px;padding:4px 7px;cursor:pointer}button:hover{background:#4b5055}pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;font:11px/1.45 Consolas,monospace;user-select:text}";
      const panel = document.createElement("section");
      const header = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = "AI Chat Organizer — диагностика";
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:5px";
      const makeButton = (label, handler) => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = label; b.dataset.label = label;
        b.title = label === "×" ? "Скрыть диагностику" : label;
        b.addEventListener("click", () => handler(b));
        return b;
      };
      actions.append(
        makeButton("Копировать", (b) => copyText(diagnosticInfo ? diagnosticInfo.textContent : "", b)),
        makeButton("Снимок DOM", (b) => copyText((diagnosticInfo ? diagnosticInfo.textContent : "") + "\n\n" + diagnosticSnapshot(), b)),
        makeButton("×", () => { uiPrefs.diagHidden = true; saveUiPrefs(); removeDetectionDiagnostic(); })
      );
      header.append(title, actions);
      diagnosticInfo = document.createElement("pre");
      panel.append(header, diagnosticInfo);
      root.append(style, panel);
      document.documentElement.appendChild(diagnosticHost);
    }
    diagnosticSnapshot = () => buildSnapshot(lastScan);
    const text = buildDiagnosticText(scan);
    if (diagnosticInfo.textContent !== text) diagnosticInfo.textContent = text;
  }

  // ===================== Capturing the open chat =====================

  function pageTitle() {
    return (document.title || "").replace(/\s*-\s*Google (Search|Поиск)\s*$/i, "").trim();
  }

  function currentThreadId() {
    const main = document.querySelector("main,[role='main']");
    const node = main && main.querySelector("[data-session-thread-id],[data-thread-id],[data-conversation-id],[data-chat-id]");
    if (node) {
      const id = attributeId(node);
      if (id) return id;
    }
    return extractThreadIdFromUrl(location.href);
  }

  function isCurrentRow(el) {
    if (el.getAttribute("aria-current") || el.getAttribute("aria-selected") === "true") return true;
    if (el.querySelector("[aria-current],[aria-selected='true']")) return true;
    const anchor = el.matches("a[href]") ? el : el.querySelector("a[href]");
    return !!(anchor && anchor.href === location.href);
  }

  function resolveCurrentKey() {
    const threadId = currentThreadId();
    if (threadId) {
      const byThread = Object.keys(state.chats).find((key) => isStableChatKey(key) && state.chats[key].threadId === threadId);
      if (byThread) return byThread;
      const idKey = "id:" + threadId;
      if (state.chats[idKey]) return idKey;
    }
    if (lastScan) {
      const row = lastScan.rows.find((item) => isCurrentRow(item.el));
      if (row && state.chats[row.key]) return row.key;
    }
    const urlKey = toStableThreadKey(location.href);
    if (urlKey && state.chats[urlKey]) return urlKey;
    return urlKey;
  }

  function extractPageText() {
    const source = document.querySelector("main,[role='main']") || document.body;
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
    if (!isCurrentAiPage()) return;
    const key = resolveCurrentKey();
    if (!key || !isStableChatKey(key)) return;
    const text = extractPageText();
    const stats = currentMessageStats();
    const threadId = currentThreadId();
    const previous = state.chats[key] || {
      title: pageTitle() || titleForUrl(key), text: "", updatedAt: 0, url: "",
      threadId: "", order: null, missing: false, userMessageCount: null,
      countSource: "unknown", classification: "unknown"
    };
    const nextCount = Number.isInteger(stats.count) ? stats.count : previous.userMessageCount;
    const nextClassification = nextCount === null ? "unknown" : (nextCount >= 2 ? "multi-turn" : "single-turn");
    const textChanged = text.length >= 40 && text !== previous.text;
    const countChanged = nextCount !== previous.userMessageCount || stats.source !== previous.countSource;
    if (!textChanged && !countChanged && (!threadId || previous.threadId === threadId)) return;

    state.chats[key] = Object.assign({}, previous, {
      text: textChanged ? text : previous.text,
      updatedAt: textChanged || countChanged ? Date.now() : previous.updatedAt,
      threadId: threadId || previous.threadId,
      url: previous.url || location.href,
      userMessageCount: nextCount,
      countSource: Number.isInteger(stats.count) ? stats.source : previous.countSource,
      classification: nextClassification
    });
    const keys = Object.keys(state.chats).filter(isStableChatKey)
      .sort((a, b) => (state.chats[b].updatedAt || 0) - (state.chats[a].updatedAt || 0));
    keys.slice(MAX_INDEXED_CHATS).forEach((oldKey) => { if (oldKey !== key) state.chats[oldKey].text = ""; });
    persist();
    render();
  }

  function scanForChats() {
    scanTimer = null;
    let changed = false;
    const scan = scanHistory();
    if (!scan) {
      missCount += 1;
      if (missCount >= 3) teardown();
    } else {
      missCount = 0;
      lastScan = scan;
      region = scan.region;
      ensureInterface();
      if (applyScan(scan)) changed = true;
      if (!activePriming && scan.rows.length > 0) startPriming(scan);
      const positioned = positionHost();
      setNativeHidden(uiPrefs.open && canReplaceNativeHistory(scan) && positioned);
    }
    updateDetectionDiagnostic(scan);
    if (isCurrentAiPage()) {
      const key = resolveCurrentKey();
      if (key !== currentKey) { currentKey = key; changed = true; }
      scheduleCapture();
    }
    if (changed) { persist(); render(); }
    else if (ui && !ui.tree.childElementCount) render();
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
        if (mutations.every(isOwnMutation)) return;
        // Streaming answer text mutates constantly; it cannot change the sidebar, so only re-index it.
        if (lastScan && mutations.every((m) => isOwnMutation(m) || (m.target.closest && m.target.closest("main,[role='main']")))) {
          if (isCurrentAiPage()) scheduleCapture();
          return;
        }
        scheduleScan();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    }
    window.addEventListener("popstate", scheduleScan);
    window.addEventListener("hashchange", scheduleScan);
    window.addEventListener("pageshow", scheduleScan);
    window.addEventListener("resize", positionHost);
    window.setInterval(positionHost, 400);      // sidebar collapse/expand animations
    window.setInterval(scheduleScan, 2500);     // class-only changes are not observed
    window.setTimeout(scheduleScan, 900);
  }

  if (typeof window.__GSACO_TEST__ === "object") {
    Object.assign(window.__GSACO_TEST__, {
      state: state, uiPrefs: uiPrefs, scanForChats: scanForChats, scanHistory: scanHistory, toKey: toKey, buildSnapshot: buildSnapshot,
      getHost: () => host, getNativeHidden: () => nativeHidden, loaded: init(),
      countUserTurns: countUserTurns, toStableThreadKey: toStableThreadKey,
      isStableChatKey: isStableChatKey, currentMessageStats: currentMessageStats,
      getAllChatUrls: getAllChatUrls, assignChat: assignChat, captureCurrentPage: captureCurrentPage, applyScan: applyScan, render: render
    });
  } else {
    init();
  }
})();
