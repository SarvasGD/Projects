# 05 — Task Pack для агента Квена

**Правила работы:** задачи выполняются **последовательно** (Task 0 → Task 12). Каждая — отдельный коммит. Не начинать следующую, пока предыдущая не прошла acceptance. При неясности — спрашивать, не выдумывать.

**MCP и агентский режим:** нельзя совмещать в одном чате (см. `08_mcp_workflow.md`).

---

## Task 0 — Bootstrap

- Init Next.js 14 (App Router, TS, ESLint, Tailwind), Prisma + SQLite, Vitest, shadcn/ui.
- Структура: `app/`, `lib/`, `lib/sim/`, `lib/cards/`, `prisma/`, `data/cards/`, `docs/`, `tests/`.
- README с `npm run dev`, `npm run test`, `npx prisma migrate dev`.

**Acceptance:** `npm run dev` → пустая страница. `npx prisma migrate dev` создаёт БД. `npm run test` проходит (пустой).

---

## Task 1 — Card data service

- `lib/cards/fetch.ts`: скачивает `cards.collectible.enUS.json` и `cards.collectible.ruRU.json` из `https://api.hearthstonejson.com/v1/latest/`, сохраняет в `data/cards/` с датой.
- `lib/cards/registry.ts`: мерж по `id`, API `getCard(id)`, `searchCards(filter)`, `getCardsForDeck(cardList)`.
- Скрипт `npm run cards:update`.

**Acceptance:** после запуска скрипта карты доступны офлайн; `getCard('EX1_066')` возвращает корректный объект с русским именем.

---

## Task 2 — Deck code parser

- Реализовать `lib/deck/decode.ts` по спеке `hearthsim.info/docs/deckstrings/` (varint + base64).
- Обратный `encode.ts` (round-trip).
- Юнит-тесты: декодировать 3 известных кода из истории чата → ожидаемые списки карт.

**Acceptance:** все 3 теста проходят; `encode(decode(code)) === code`.

---

## Task 3 — Deck CRUD

- Prisma-модель `Deck`. API: `POST /api/decks` (`{name, code}` — парсит код), `GET /api/decks`, `GET /api/decks/[id]`, `DELETE`.
- UI: `/decks`, `/decks/import`, `/decks/[id]`.

**Acceptance:** можно импортировать любую колоду из чата, отображается в списке, открывается, удаляется.

---

## Task 4 — Deck analysis view

- Компоненты: `ManaCurveChart`, `TypeBreakdown`, `RarityBreakdown`, `KeyCardsList`.
- Recharts для графиков.

**Acceptance:** на странице колоды видны мана-кривая, типы, редкости; значения соответствуют деке.

---

## Task 5 — Matchup engine core (ядро Прототипа)

**Важно:** это **ядро Прототипа**, а не MVP. Без него нет продукта.

- `lib/sim/state.ts` — типы состояния и minion.
- `lib/sim/effects.ts` — реестр обработчиков, фолбэк по тегам текста.
- `lib/sim/policy.ts` — AI по архетипу (aggro/tempo/midrange).
- `lib/sim/matchup.ts` — `simulateMatchup(deckA, deckB, params) → GameResult[]`.
- Ручные обработчики: Рыцарь Горького Цветка, Бесчисленные возможности, Зазубренное лезвие времени, Морхи, МАТРИАРХ, Разрушитель Перекрёстка, Прозорливый дракозмей, Темночешуйчатая праматерь.
- UI: `/tests/new` — форма запуска (A, B, games, seed, coin).

**Acceptance:**

- 1000 партий < 5 сек.
- Результат соответствует схеме.
- HP и turns консистентны (turns > 0, hp ≥ 0).
- При фиксированном seed результат детерминирован.
- Плашка «model-based estimate» на странице результата.

---

## Task 6 — Test runs persistence

- Prisma: `TestRun`, `GameResult`. API: `POST /api/tests` (создаёт run, запускает симуляцию, сохраняет), `GET /api/tests`, `GET /api/tests/[id]`.
- UI: `/tests`, `/tests/[id]`.

**Acceptance:** тест-ран сохраняется, переоткрывается после рестарта сервера, все 1000 партий достаются из БД.

---

## Task 7 — Winline extraction

- `lib/sim/winlines.ts`: из `GameResult[]` выбрать 4–5 репрезентативных, сохранить в `Winline`.
- UI: на `/tests/[id]` — блок «Winlines» с раскрывающимся логом по ходам.

**Acceptance:** для любого теста открываются ≥ 3 winline с полным turn-by-turn логом.

---

## Task 8 — Comparative dashboard

- `/matrix` — таблица winrate колода × колода по всем сохранённым тестам.
- `/decks/[id]/matchups` — winrate против каждого противника (с фильтром по классу).

**Acceptance:** при ≥ 3 тестах для деки отображается агрегированная статистика.

---

## Task 9 — Deck builder (drag-and-drop)

- `/decks/[id]/builder` — конструктор: карты с картинками, счётчик 30 слотов, предупреждения о невалидной деке, стоимость крафта.
- Кэш картинок карт локально.

**Acceptance:** можно собрать колоду с нуля или отредактировать существующую; счётчик показывает 30/30; предупреждения о < 30, > 30, > 2 копий.

---

## Task 10 — Быстрый цикл «правка → тест → дельта»

- Из конструктора → кнопка «Прогнать matchup» → результат в модалке/странице с дельтой winrate относительно предыдущего прогона.

**Acceptance:** после правки 1–2 карт и повторного прогона видна дельта winrate.

---

## Task 11 — Archetype expansion (control + combo)

- `policy.ts`: добавить policy для контроля (ремувал, heal, торг по HP) и комбо (протект combo-кусков, добор под ключ, lethal-check).
- Тесты: контроль A vs aggro B → winrate в ожидаемом коридоре (±15%).
- Тесты: комбо A vs midrange B → winrate в ожидаемом коридоре (±15%).
- `docs/archetypes.md`: обновить статусы.

**Acceptance:** 5 policy покрывают 5 архетипов; все тесты зелёные.

---

## Task 12 — Hybrid + presets

- `policy.ts`: hybrid (адаптивный, зависит от HP и стадии).
- Пресеты колод: Mech / Dragon / Undead / Elemental / Pirate / Totem — загружены как стартовые деки.
- UI: фильтр по архетипу на `/matrix`.

**Acceptance:** 6 policy (aggro/tempo/midrange/control/combo/hybrid); дашборд фильтруется.

---

## Task 13 — Deploy & docs

- Dockerfile + docker-compose.
- `.env.example`.
- `docs/rules.md` — точные механики.
- `docs/approximations.md` — упрощённые механики.
- `docs/archetypes.md` — roadmap архетипов.

**Acceptance:** `docker compose up` поднимает приложение, БД персистится.

---

## Milestones

| Milestone ↕▾ | Задачи ↕▾ | Итог ↕▾ |
|---|---|---|
| −M1 — Skeleton | 0–4 | Импорт, просмотр, анализ колод |
| −M2 — Matchup | 5–6 | Matchup-симулятор, история тестов |
| −M3 — Analytics | 7–8 | Winlines, дашборд |
| −M4 — Builder | 9–10 | Конструктор, быстрый цикл |
| −M5 — Archetypes | 11–12 | Все 6 архетипов, hybrid |
| −M6 — Deploy | 13 | Docker, docs |
| −