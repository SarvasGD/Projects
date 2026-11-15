# HDMS MVP

Model-based Hearthstone Deck Matchup Simulator. Симуляция matchup A vs B (**server или Web Worker**), N×N матрицы (**с drag-and-drop**), конструктор колод с быстрым циклом «правка → тест → дельта», история тестов (IndexedDB), экспорт JSON/PNG, Docker.

## Что делает

### Симуляция A vs B

- Парсит два deck-кода (Стандарт и Вольный).
- Полная база карт HearthstoneJSON (ruRU).
- Пошаговая игра: мана, добор, усталость, разыгрывание, атака, размен, face.
- **Hero Power** Rogue (Кинжал → Imbue 1-10), **Imbue** от карт.
- **Battlecry/Spell:** урон, лечение, добор, броня, destroy, buff, summon, freeze, silence, transform, copy from opponent hand.
- **Секреты:** активируются, триггерятся по событию.
- **Combo**, ручные обработчики (Морхи, Разрушитель Перекрёстка, МАТРИАРХ, Темночешуйчатая праматерь).
- **Discover:** кэш пула + 1/3 best/average/worst.
- **AI с lookahead:** lethal-check, AOE-pick, trade-priority.
- **Win paths**, **Winlines** с логом.
- **maxTurns**, **муллиган**, экспорт **JSON** и **PNG** (html2canvas).
- **3 режима запуска:**

- **☁ Сервер** — стандартный, POST /api/simulate.
- **⚡ Параллельно** — 4 батча через Promise.all (от 400 партий).
- **🖥 Web Worker** — симуляция в браузере, не блокирует UI, работает офлайн после первой загрузки базы карт.

### Матрица (3+ колод) — **drag-and-drop**

- Слоты колод с **порядком через drag-and-drop** (хватай за ⋮⋮ и тащи).
- Автодекодирование при вставке кода: класс, format, кол-во карт, ср. мана.
- 2–8 колод, попарный winrate N×N, средний winrate, экспорт JSON.

### Конструктор колод

Импорт → удаление/добавление с поиском → быстрый тест → дельта winrate.

### История тестов (IndexedDB)

Сохранение в браузере, просмотр, экспорт JSON, удаление, очистка.

## Быстрый старт

### Windows — запуск двойным щелчком

- **Start HDMS.bat** — проверяет Node.js, при необходимости устанавливает зависимости, запускает локальный сервер и открывает браузер. Окно сервера нужно оставить открытым; закрытие окна останавливает HDMS.
- **Check HDMS.bat** — выполняет проверку TypeScript, все автоматические тесты и production-сборку.
- **Update HDMS.bat** — получает актуальную версию из GitHub и переустанавливает зависимости. Скрипт откажется обновляться, если в локальном Git-репозитории есть незакоммиченные изменения.

Требуется Node.js 20+ и Git для обновления из GitHub.

### Запуск вручную

```
npm ci
npm run dev
```

- `/` — A vs B
- `/matrix` — матрица с drag-and-drop
- `/builder` — конструктор
- `/history` — история

**Web Worker:** включи чекбокс «Web Worker» перед запуском. Первый запуск грузит базу карт в контекст воркера (10-15 сек), затем — быстро. Если worker падает — автоматически fallback на сервер.

## Docker

```
docker compose up --build
```

## Проверка проекта

```
npm run typecheck     # проверка TypeScript
npm test              # автоматические тесты без сети
npm run build         # production-сборка
npm run check         # все три проверки последовательно
``

GitHub Actions автоматически выполняет `npm run check` при изменениях в HDMS MVP.


## Тестовые коды

**Тёмная Зарядка (Rogue):**

```
AAECAdWQCArDgwfygwe/hwfRnQfmowfIrgeZsQfysgeI2QeI3QcK958EtfoG9YEH94EHkIMHwYcHx64HmrMHurMHnIIIAAA==
```

**ДраконЗарядка (Rogue):**

```
AAECAaIHCPKDB+ajB5WkB/KyB4jZB5HZB43aB4TpBwv3nwT3gQeQgwf3gwfHrgfrsgfssgeaswe6sweEvQe1wCAAA==
```

(обрати внимание: правильный код — из README исходника; если не декодируется, скопируй из истории чата)

## Архитектура

- `lib/cards/registry.ts` — база карт (fetch + кэш).
- `lib/deck/decode.ts`, `raw.ts`, `encode.ts` — парсеры.
- `lib/presets.ts` — пресеты.
- `lib/history/` — IndexedDB (db.ts, types.ts).
- `lib/export/png.ts` — html2canvas-обёртка.
- `lib/sim/runner.ts` — **общий runner** для API и Worker.
- `lib/sim/worker.ts` — **Web Worker entry**.
- `lib/sim/clientWorker.ts` — клиентский класс `MatchupWorker`.
- `lib/sim/engine.ts`, `effects.ts`, `secrets.ts`, `randomCards.ts`, `heroPowers.ts`, `matchup.ts`, `parallel.ts`.
- `components/SaveTestButton.tsx`, `ExportPngButton.tsx`.
- `components/matrix/DeckSlot.tsx` — **drag-and-drop слот**.
- `app/api/simulate/route.ts`, `simulate-matrix/route.ts`, `cards/batch/route.ts`, `cards/search/route.ts`, `deck/encode/route.ts`, `deck/decode/route.ts`.
- `app/page.tsx`, `matrix/page.tsx`, `builder/page.tsx`, `history/page.tsx`.

## Ограничения

- Model-based, не полный движок Blizzard.
- Сложные эффекты без шаблонов — «ванильные».
- Секреты распознаются по regex.
- Рекурсивное копирование не реализовано.
- AI — жадный + lookahead на 1 ход.
- История тестов в браузере (IndexedDB), не синхронизируется между устройствами.
- Worker симулирует только A vs B (не матрицу).