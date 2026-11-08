# Google Search AI Chat Organizer

Manifest V3 extension for Chromium-based browsers: Yandex Browser, Vivaldi, Opera and Chrome.

## Implemented in this MVP

- Nested folders with a hard limit of four levels.
- Folder naming, colors, rename and delete actions.
- HTML5 drag-and-drop from the detected Google Recent list and from organizer chat rows.
- Local storage in chrome.storage.local:
  - google_ai_folders — nested folder tree and chat URL membership.
  - google_ai_chats — chat titles, timestamps and locally captured text index.
- Search across titles, query URLs and captured conversation text.
- Markdown and TXT export of a session's captured page text.
- MutationObserver-based discovery for Google's dynamic / SPA sidebar.
- Shadow DOM UI to isolate organizer styles from Google page styles.

## Install for local testing

1. Download this folder or clone this repository and check out branch feature/google-search-ai-chat-organizer.
2. Open the browser's extensions page.
3. Enable Developer mode.
4. Choose Load unpacked / Загрузить распакованное расширение and select this folder.
5. Open a Google AI Mode search page on a supported Google domain.

No build step or external dependency is required.

## Important behavior and limits

### Google DOM detection

Google does not provide a stable public DOM contract for its AI Mode history panel. The content script deliberately avoids obfuscated CSS class names. It detects a Recent / Недавние heading (including common localized labels), walks its ancestor structure, and looks for Google /search links with a q parameter. When that explicit section is found, native link rows are hidden and represented in the organizer's Unsorted list until assigned to folders.

If Google's labels or DOM structure change, discovery may stop. The script leaves unrelated Google navigation alone rather than hiding a guessed container. Inspect the current page DOM and update findRecentSection() / getRowForAnchor() for the new structure.

MutationObserver watches added history links and href changes. Google may lazy-load history only when its original scroll area is scrolled; links rendered in the DOM are imported, and links added later are imported when Google inserts them. This version does not force-scroll Google's sidebar or fetch hidden conversations in the background.

### Full-text index and export

For privacy and minimal permissions, the extension does not make background requests to old Google sessions. It captures visible text from the main content area only while an AI Mode session is open in the active tab. A chat's full-text search and export therefore become available after that session has been opened while the extension is installed.

The exported Markdown/TXT contains the captured page text, title and URL. This is a text snapshot, not a structured reconstruction of individual user / assistant message objects. Very long pages are capped at 24,000 characters per chat. Up to 250 most-recently indexed chat records are retained; older records keep their URL/title but may lose cached body text.

### Permissions and privacy

Only the storage permission is requested. No analytics, remote server, account, cloud sync, translator or prompt manager is included. Folder structure and captured text remain in browser local extension storage.

## Supported URL patterns

- google.com
- google.ru
- google.se
- google.co.uk
- google.de
- google.fr
- google.es
- google.ca
- google.com.au
- google.co.in

The content script runs on /search URLs on these domains.

## Manual smoke test

1. Load the unpacked extension and open a Google AI Mode conversation.
2. Confirm the organizer appears near the Recent list and visible Recent links are represented under Без папки.
3. Create a top-level folder and three nested subfolders. Confirm a fifth level cannot be created.
4. Drag a chat into a folder, reload the page, and confirm membership is preserved.
5. Rename a folder, change its HEX color and delete it. Confirm child folders are promoted rather than discarded.
6. Open at least two AI Mode conversations so both get indexed. Search for a distinctive word that appears only in the response text.
7. Export a chat to Markdown and TXT.
8. Repeat in Yandex Browser, Vivaldi and Opera. Google may serve different DOM variants by locale and account, so the history-panel detection requires real-browser verification.

## Files

- manifest.json — Manifest V3 configuration.
- content.js — detection, sidebar integration, tree UI, storage, local index, search, export and drag-and-drop.
