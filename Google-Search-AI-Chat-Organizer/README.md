# Google Search AI Chat Organizer

Chromium Manifest V3 extension for organizing **actual Google AI Mode conversations**, not arbitrary search-history entries.

**Candidate build:** v0.4.0  
**Project stage:** Prototype in progress — Prototype Gate not passed.  
**main:** v0.3.2 until v0.4.0 PR is merged.

## What v0.4.0 changes
- Requires stable thread/session identity (explicit Google data ID or URL with thread identity).
- q-only URLs and generic clickable rows are not treated as chats.
- Title-only identity fallback is removed.
- Counts user turns from explicit user-role markers or transcript markers inside AI Mode Conversation.
- Adds filters: All, 2+ user turns, 1 user turn, Not calculated.
- Saves the selected filter mode.
- Keeps old title-only local records without deleting text, but hides them from the confirmed active list.
- Does not hide native Google history while rows are unclassified or scan is incomplete.
- Persists message count/classification for opened sessions.
- Markdown remains the only export format.

## Current limitations
- User-turn count is available after a session is opened/read. Full history importer with progress, Resume and retry is not implemented.
- Exact thread identity and message markers must be confirmed against the live Google AI Mode DOM. CI uses fixtures and cannot prove current account DOM.
- History DOM changes (add/rename/delete) are covered by jsdom and Chromium fixtures. Full history import, explicit empty-history handling and live Google DOM verification remain outstanding.
- Playwright browser harness is implemented: CI loads the unpacked MV3 extension into Chromium on Google-origin fixtures and checks stable identity, message count, filtering, collapse/restore and q-only fallback. It does not prove the current live Google account DOM.
- This is a technical prototype candidate, not an MVP.

## Project documentation
- [Functional product roadmap](Документация/Функциональная%20дорожная%20карта%20продукта.md)
- [Task definition and acceptance criteria](Документация/Постановка-задачи-и-критерии-приёмки.md)
- [Data architecture and automatic synchronization](Документация/Архитектура-данных-и-автоматической-синхронизации.md)
- [Tooling and automated testing](Документация/Инструментарий-и-автоматизированная-проверка.md)
- [Implementation plan and milestones](Документация/План-реализации-и-контрольные-вехи.md)
- [Conversation work register](Meta/Наработки-диалога.md)

## Automated checks
From this directory:

    node --check content.js
    npm test
    npm run test:browser
    npm run test:all

CI validates Manifest V3, referenced scripts, JS syntax, 22 jsdom tests and the MV3 extension in Chromium. Latest passing run: https://github.com/SarvasGD/Projects/actions/runs/45357784393. Fixtures do not replace live Google DOM validation.

## User testing policy
The developer performs all routine checks first. User participation is reserved for consolidated Prototype Gate, MVP Gate and Closed Beta acceptance — not individual UI patches, buttons or PRs.
