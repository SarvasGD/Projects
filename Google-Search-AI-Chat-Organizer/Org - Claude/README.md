# Google Search AI Chat Organizer

Manifest V3 extension for Chromium-based browsers (Yandex Browser, Vivaldi, Opera, Chrome).
Adds nested folders, local full-text search and Markdown/TXT export to the **Recent / Недавнее**
history of Google AI Mode (`google.com/search?udm=50`).

## What it does

- Nested folders (max 4 levels): create, rename, recolor, delete (children are promoted).
- Drag a chat from the organizer list into a folder. Folder membership survives reloads.
- **Replaces** Google's "Recent" list: the organizer is laid exactly over Google's own history box,
  lists *all* chats (lazy-loaded history is scrolled in automatically) and opens them by proxying a
  click to the real row. Button `⇄` collapses it to a bar and shows Google's native list again.
- Search over titles and the locally captured text of chats you have opened.
- Markdown/TXT export of a captured chat. Everything is stored in `chrome.storage.local`
  (`google_ai_folders`, `google_ai_chats`, `google_ai_ui`). Only the `storage` permission is used.

## How it works (v0.3.0)

1. **Find the box.** The visible "Recent" heading is only an anchor. The history *region* is its nearest
   scrollable ancestor (Google's own list box); if there is none, the largest ancestor that does not
   contain "New chat / Search threads / Settings".
2. **Find the rows.** Rows are not required to be `<a href="...q=...">`. Any outermost clickable,
   row-sized element (`a`, `[role]`, `li`, `[jsaction]`, `cursor:pointer`, 20-90 px high) inside the region is a row.
   Skip-links and navigation labels are ignored.
3. **Identity.** A chat key is built from, in order: the canonical URL (`host + path + q + udm + known
   thread-id params`, see `IDENTITY_PARAMS`), a `data-*thread/session/conversation/chat/mtid` attribute,
   or the normalised title. Volatile parameters (`ved`, `ei`, `mstk`, `aep`, ...) are ignored, so the same chat
   can no longer appear several times. Rows that share a key get `|2`, `|3` suffixes instead of being merged or duplicated.
4. **Reconcile.** After each scan the local list is aligned with Google's list: titles/order are refreshed,
   entries whose key changed are re-bound by title (folders and indexed text are kept), and - only after the
   list was fully loaded - stale unassigned entries are pruned. Assigned entries are kept and marked as missing.
5. **Overlay.** The organizer is a `position:fixed` shadow-DOM card placed over the region rectangle, so it
   no longer depends on (or squeezes) Google's flex/grid layout. Google's list is hidden (`visibility:hidden`)
   only once the whole list is loaded and the organizer is open.
6. **Migration.** Data from v0.2.x is re-keyed on load: duplicates collapse, "Skip to settings" entries are dropped.

## Install for local testing

1. Download this folder (or clone the repository).
2. Open the browser's extensions page and enable Developer mode.
3. Load unpacked and select this folder. No build step or dependencies.
4. Open a Google AI Mode page on a supported Google domain (`/search`).

Supported domains: google.com, .ru, .se, .co.uk, .de, .fr, .es, .ca, .com.au, .co.in.

## Diagnostics

A card in the top-right corner (hide it with **Скрыть**, the choice is remembered) reports detection
status: heading found, region geometry, number of rows by key kind (URL / id / title), whether lazy loading
finished, organizer state. **Копировать** copies the report; **Снимок DOM** additionally copies an anonymised
outline of the history DOM (tag names, attribute names, URL parameter *names*, geometry - no titles, no query values).
Send it when detection fails after a Google UI change.

## Known limits

- Google has no stable public DOM for AI Mode history. If it changes, update `findHistoryRegion()` / `detectRows()`;
  the snapshot above shows what is needed.
- Two *different* chats that share the same canonical key (same `q`/thread parameters) are listed as separate rows
  (`|2` suffix), but their order-based keys can swap if Google reorders identical entries.
- Response text is indexed only while a chat is open in the active tab (no background fetching).
  Up to 100 most recently indexed chats keep body text (10 000 characters each).
- `HOST_Z_INDEX` (1000) controls the overlay's stacking; raise it if Google's sidebar paints above the organizer.

## Tests

```
cd tests && npm i jsdom && node smoke.test.js
```

Synthetic-sidebar smoke tests (jsdom): detection without `q` links and without any links, duplicate titles,
overlay geometry, lazy-loading priming, migration of duplicates, pruning, re-binding, click proxying,
teardown and snapshot anonymisation. They do not replace a manual check in a real browser.

## Manual smoke test

1. Open a Google AI Mode conversation; the organizer should cover the "Recent" box and list all chats
   (compare the count with the diagnostic card and with the native list via `⇄`).
2. Reload twice: the chat count must not grow.
3. Create a folder with three nested subfolders; a fifth level must be impossible.
4. Drag a chat into a folder, reload, confirm membership.
5. Click a chat in the organizer: the chat opens as if clicked in Google's list.
6. Open two chats, search for a word that is only in the answer text, export one to MD and TXT.
7. Repeat in Yandex Browser, Vivaldi and Opera.

## Files

- `manifest.json` - Manifest V3 configuration.
- `content.js` - detection, reconcile, overlay UI, storage, index, search, export, diagnostics.
- `tests/smoke.test.js` - jsdom smoke tests.
