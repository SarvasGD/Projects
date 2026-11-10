# 04 — Техническая спецификация HDMS

## Архитектура

```
┌─────────────────────────────────────────┐
│  Next.js 14 (App Router, TS, Tailwind)  │
│  UI: deck import, deck detail, test     │
│    runner, results, history, builder    │
│  API routes: /api/decks, /api/tests     │
└──────────────────┬──────────────────────┘
                   │ Prisma
                   ▼
┌─────────────────────────────────────────┐
│  SQLite (Prisma, dev) / Postgres (prod) │
│  Deck / TestRun / GameResult / Winline  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Simulation Engine (TS, worker_threads) │
│  deckParser, cardDB, effectRegistry     │
│  goldfish.ts, matchup.ts                │
│  policy.ts (AI per archetype)           │
└──────────────────┬──────────────────────┘
                   │ HTTP fetch (кэш)
                   ▼
┌─────────────────────────────────────────┐
│  HearthstoneJSON                        │
│  cards.collectible.{enUS,ruRU}.json     │
└─────────────────────────────────────────┘
```

---

## Технологический стек

| Слой ↕▾ | Выбор ↕▾ | Почему ↕▾ |
|---|---|---|
| −Frontend + API | **Next.js 14 App Router, TypeScript** | Single deploy, серверные роуты, типы |
| −ORM | **Prisma** | Миграции, типы, SQLite → Postgres без изменений |
| −БД | **SQLite** (dev) → **Postgres** (prod) | Локально бесплатно, миграция тривиальная |
| −Стили | **Tailwind + shadcn/ui** | Быстрый UI без кастомного дизайна |
| −Графики | **Recharts** | Мана-кривая, распределения |
| −Симуляция | **TypeScript + worker_threads** | 10k партий за секунды |
| −Кэш карт | локальный `data/cards/` | Не зависим от сети после первой загрузки |
| −Тесты | **Vitest** | Парсер, движок, policy — юнит-тесты |
| −Платежи | **Paddle** (Merchant of Record) | Берёт на себя налоги, возвраты, безопасность |
| −Деплой | **Docker + docker-compose** | Простой self-hosted, потом — облако |
⚙

**Отказ от Python:** единый стек важнее скорости — 1000 партий модели на TS считаются за 1–3 сек.

---

## Модель данных (Prisma)

```
model Deck {
  id        String   @id @default(cuid())
  name      String
  code      String
  class     String
  format    String   // "standard" | "wild"
  cards     Json
  createdAt DateTime @default(now())
  testsA    TestRun[] @relation("A")
  testsB    TestRun[] @relation("B")
}

model TestRun {
  id         String   @id @default(cuid())
  deckAId    String
  deckBId    String
  deckA      Deck     @relation("A", fields: [deckAId], references: [id])
  deckB      Deck     @relation("B", fields: [deckBId], references: [id])
  params     Json     // { games, seed, coinA, coinB, maxTurns }
  status     String   // pending | running | done | failed
  summary    Json?
  startedAt  DateTime @default(now())
  finishedAt DateTime?
  games      GameResult[]
  winlines   Winline[]
}

model GameResult {
  id            String  @id @default(cuid())
  testRunId     String
  gameIndex     Int
  winner        String  // "A" | "B" | "draw"
  turns         Int
  hpRemainingA  Int
  hpRemainingB  Int
  log           Json
  testRun       TestRun @relation(fields: [testRunId], references: [id])
}

model Winline {
  id         String  @id @default(cuid())
  testRunId  String
  kind       String  // fastest_a | fastest_b | highest_hp_a | typical
  winner     String
  turns      Int
  hpWinner   Int
  hpLoser    Int
  log        Json
  testRun    TestRun @relation(fields: [testRunId], references: [id])
}
```

---

## Симуляция: спецификация

### Goldfish (Прототип, фича #2 частично)

- Вход: колода + параметры (ход первый / на монете, mulligan).
- Выход: `{ drawProbabilities, comboAssemblyTurn, damagePerTurn[] }`.
- Monte Carlo N = 10 000, seed фиксируемый.
- Модель: «голодная» игра карт по кривой, без противника.

### Matchup (Прототип, фича #2)

**Состояние игрока:**

```
{ hp, armor, mana, maxMana, heroPowerLevel,
  hand: Card[], deck: Card[], board: Minion[],
  fatigue, weapon?, mulliganDone: bool }
```

**Разрешение карт (effectRegistry):**
Каждая карта имеет обработчик `(state, owner, target?) => state` в `effects.ts` по `dbfId`. Для неизвестных — фолбэк по тегам текста (damage / draw / heal / summon / buff / manaGain).

**Ручные обработчики (обязательно в Task 6):**

- Рыцарь Горького Цветка
- Бесчисленные возможности
- Зазубренное лезвие времени
- Морхи
- МАТРИАРХ
- Разрушитель Перекрёстка
- Прозорливый дракозмей
- Темночешуйчатая праматерь

**Turn loop:**

1. Start: `maxMana = min(10, maxMana+1)`, `mana = maxMana`, draw 1, fatigue если пусто.
2. Play loop: пока есть играбельные карты → score → play best → check lethal.
3. Attack loop: minions → trade или face по policy.
4. Hero power если mana ≥ cost.
5. End: сброс временных бафов, `turn++`.

**AI policy (`policy.ts`):**

- `aggro`: face > trade, приоритет урону.
- `tempo`: оптимальный trade по ratio, pressure.
- `midrange`: mix, зависит от HP противника.
- `control`: ремувал, heal, торг по HP.
- `combo`: протект combo-кусков, добор под ключ, lethal-check.
- `hybrid`: адаптивный (Task 12).

**Win conditions:**

- HP ≤ 0
- Fatigue death
- `maxTurns` (по умолчанию 30) → draw (или сравнение HP).

**Monte Carlo:**

- N партий (1000 по умолчанию, до 20 000), seed фиксируемый.
- Агрегация: `winrate`, распределение ходов, распределение HP, средний ход победы.

**Winlines:**
Из N партий выбираются:

- самый быстрый выигрыш A
- самый быстрый выигрыш B
- победа A с максимальным HP
- победа B с максимальным HP
- «медианная» партия

Log = `[{ turn, player, action, detail, hpA, hpB, boardSummary }]`.

---

## UI: страницы

| Страница ↕▾ | Что показывает ↕▾ |
|---|---|
| −`/decks` | Список сохранённых колод |
| −`/decks/import` | Форма импорта по deck-коду |
| −`/decks/[id]` | Детали колоды: мана-кривая, типы, редкости, ключевые карты |
| −`/decks/[id]/builder` | Конструктор (drag-and-drop, счётчик 30 слотов) |
| −`/tests` | История тест-ранов |
| −`/tests/[id]` | Результаты: winrate, распределение ходов, HP, winlines |
| −`/tests/new` | Запуск нового matchup-теста |
| −`/matrix` | Winrate матрица по всем тестам |
| −`/decks/[id]/matchups` | Winrate против каждого противника |
⚙

---

## Плашка «model-based estimate»

На всех экранах с результатами — обязательная плашка: «Model-based estimate, not official simulation. See approximations.md».

Список упрощений доступен по клику (секреты, Discover, копирование, рекурсивные цепочки).

---

## Правила карт

Отдельный файл `07_rules_and_approximations.md` — точные и упрощённые механики.

---

## Карта данных

- Источник: `https://api.hearthstonejson.com/v1/latest/{enUS,ruRU}/cards.collectible.json`
- Кэш: `data/cards/` с датой скачивания.
- Скрипт обновления: `npm run cards:update`.
- Мерж по `id`.
- **Русские названия карт — приоритетные** (per memory).