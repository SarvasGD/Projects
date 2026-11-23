# Google Search AI Chat Organizer

Manifest V3 extension for Chromium-based browsers (Yandex Browser, Vivaldi, Opera, Chrome).

**Main:** v0.3.2 · **Development:** v0.4.0 (Prototype Gate in progress).

Adds nested folders, local full-text search over captured conversations, and Markdown export to Google AI Mode history.

## User-facing behaviour

- Replaces Google's Recent history box with an overlay occupying the same measured area.
- Imports confirmed AI Mode chat rows only when a stable thread/session identity is available; other rows remain unclassified.
- Scrolls Google's own history scroller to the end before replacing the native list.
- Restores Google's original list through the collapse/expand controls (`⌃` and `⌄`).
- Supports four folder levels, folder rename/color/removal, drag-and-drop, local search and Markdown export.
- Clicking a confirmed organizer row proxies the click to the exact Google history row; title-only matching is not used.
- Uses only `chrome.storage.local`; no background fetching or external service.

## Detection and identity

The visible `Recent / Недавнее` heading identifies the history area. The overlay is positioned over a bounded history region, not inserted into Google's navigation layout. The nearest bounded scroll container is used for lazy loading; a larger enclosing box is selected only when it remains within the left rail and does not contain New chat, Search threads or Settings.

Rows are detected from clickable elements and row geometry, not only from `q` links. Identity priority is:

1. Explicit row data ID (`data-session-thread-id`, `data-thread-id`, `data-conversation-id`, `data-chat-id`, `data-session-id`, `data-mtid`).
2. Canonical Google URL identity: host, path, `q`, `udm` and known thread ID query parameters.
3. Normalised title as a fallback.

When multiple rows share a base key, they remain separate with an order suffix. Their order can change if Google reorders rows that expose no unique ID or URL identity.

## Reconciliation and data safety

- Existing 0.2.x records are migrated with an exact old-URL-to-new-key map; collisions are preserved as separate suffixed records rather than merged.
- Folder assignments follow the same migration map.
- Obvious accessibility skip-links such as `Skip to settings` are excluded.
- Once Google confirms that its history list is fully loaded, records absent from the current list are marked missing and placed in a collapsed `Нет в текущей истории` group (or remain in their assigned folder).
- Old records are not automatically deleted. This avoids losing conversations that are archived, temporarily unavailable or not currently shown by Google.

## Full-text index and export

Text is captured only while an AI Mode chat is open in the active tab. There are no background requests for old sessions. Up to 100 most recently indexed chats retain up to 10,000 characters each. Export contains a text snapshot, title and source URL.

## Diagnostics

The top-right diagnostic card reports the detected heading, history region, row count and key types, lazy-load completion, overlay visibility, native-list visibility and retained missing records. It provides **Копировать**, **Снимок DOM** (an anonymised DOM outline without titles/query values), and **Скрыть**.

## Permissions

Only the `storage` permission is requested. Folder structure and captured text remain in browser-local extension storage.

## Supported Google domains

`google.com`, `google.ru`, `google.se`, `google.co.uk`, `google.de`, `google.fr`, `google.es`, `google.ca`, `google.com.au`, `google.co.in`.

## Automated tests

The jsdom smoke suite covers row discovery without q-links, explicit row IDs, duplicate titles, overlay geometry, lazy loading, non-destructive migration, folder assignment preservation, click proxying, teardown and anonymised diagnostics.

Run from this directory:

```bash
npm install --no-save --package-lock=false
npm test
```

These tests use synthetic DOM geometry. They verify the logic but do not replace a real-browser visual check.

## Milestone browser acceptance

The developer runs automated and fixture-based checks for every change. A real-account browser check is requested from the user only at consolidated milestones:

- **Prototype gate:** identity/classification, user-message count, full history loading, and overlay/native-list fallback.
- **MVP gate:** one end-to-end pass covering sync, folders/moves, search and Markdown export.
- **Closed Beta gate:** native Google deletion, recovery, and supported-browser compatibility.

Do not ask the user to test individual CSS changes, controls, commits or pull requests.

## Документация проекта

- [Функциональная дорожная карта продукта](Документация/Функциональная%20дорожная%20карта%20продукта.md)
- [Постановка задачи и критерии приёмки](Документация/Постановка-задачи-и-критерии-приёмки.md)
- [Архитектура данных и автоматическая синхронизация](Документация/Архитектура-данных-и-автоматической-синхронизации.md)
- [Инструментарий и автоматизированная проверка](Документация/Инструментарий-и-автоматизированная-проверка.md)
- [План реализации и контрольные вехи](Документация/План-реализации-и-контрольные-вехи.md)
- [Реестр наработок диалога](Meta/Наработки-диалога.md)


## v0.4.0 prototype behaviour

The v0.4.0 development branch requires a stable thread/session identity before treating a history row as an active chat. Rows without a confirmed identity remain unclassified. If no row has a stable identity, the extension fails open and leaves Google's native history visible.

Automated checks include 21 jsdom smoke tests and 3 Playwright Chromium MV3 integration tests. These use synthetic Google-like fixtures and do not replace the real Google DOM Prototype Gate.
