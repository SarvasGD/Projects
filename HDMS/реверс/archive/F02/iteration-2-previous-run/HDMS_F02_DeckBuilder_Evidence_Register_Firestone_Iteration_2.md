# Evidence Register — Функция № 2 «Визуальный конструктор колод» (Итерация 2)
Документ исследовательского контура. Содержит указания на источники и смысл доказательств. Заполнен по шаблону `04_EVIDENCE_REGISTER_TEMPLATE.md`.

## 1. Паспорт исследования (Итерация 2)
| Поле | Значение |
| --- | --- |
| Функция / задача | Функция № 2 — визуальный конструктор колод (Constructed) |
| Назначенный донор | Firestone |
| Canonical URL | https://github.com/Zero-to-Heroes/firestone |
| Commit SHA | `0a30f066eb77a417637d95cec86444456f607ba1` (подтверждён 2026-11-24) |
| Метод верификации | Прямое чтение исходных файлов через `raw.githubusercontent.com` с нумерацией строк |
| Версия спецификации | 2.0 (Итерация 2) |

## 2. Журнал исследованных материалов (Дополнения итерации 2)
Все ссылки ведут на зафиксированный commit `0a30f066eb77a417637d95cec86444456f607ba1`.

| Evidence ID | Путь / URL | Тип | Строки | Что проверялось | Результат наблюдения | Качество | Связанные правила / тесты |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EV-120 | `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts` | исходный модуль | ~430-450 | Алгоритм расчёта `missingDust$` | Используется `collection.find((c) => c.id === cardId)`. Агрегация по «двойникам» (counterparts) **не выполняется**. При пустой коллекции `getTotalOwned()` = 0, пыль рассчитывается полностью. | A | R-35, C-02, TC-45 |
| EV-121 | `libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts` | исходный модуль | ~180-210 | Алгоритм расчёта `inCollection` (маркер нехватки) | Используется `getOwnedForDeckBuilding`, который агрегирует владение по всем версиям-«двойникам» карты через `getAllCardDuplicateIdsForDeckbuilding`. | A | R-36, C-02, TC-45 |
| EV-122 | `libs/legacy/feature-shell/src/lib/js/services/collection/sets-manager.service.ts` | исходный модуль | ~30-40 | Обработка `null` коллекции | `collection = collection ?? [];` — null заменяется на пустой массив, что приводит к нулевому владению в `SetCard`. | A | R-37, E-25 |
| EV-123 | `libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts` | исходный модуль | ~90-110 | Поведение `@Input() set collection` при пустом значении | `if (!value?.length) { this.normalizedCollection$$?.next(null); }`. Далее `inCollection = collection == null ? true : ...` (всё считается имеющимся). | A | R-37, E-25 |
| EV-124 | `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-format.component.ts` | исходный модуль | ~40-50 | Состав форматов в UI | Массив `['standard', 'wild', // 'twist']`. Twist закомментирован. | A | R-02, TC-01 |
| EV-125 | `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts` | исходный модуль | ~200-220 | Логика `validSets` | Поддерживаются `classic`, `standard`, `twist`, по умолчанию `wild`. | A | R-02, TC-04 |
| EV-126 | `libs/shared/common/service/src/lib/services/deck-utils.ts` | исходный модуль | ~10-20 | Функция `sanitizeDeckDefinition` | `return deckDefinition;` — тождественная операция (no-op). Round-trip зависит от `@firestone-hs/deckstrings`. | A | R-46, TC-46 |
| EV-127 | Инвентаризация `deckbuilder` каталога и `package.json` | отрицательная проверка | всё дерево | Наличие Drag-and-Drop | Совпадений по `cdkDrag`, `dnd`, `draggable` нет. `preventDrag` и `onMouseDown` вызывают только `event.stopPropagation()` на текстовых полях. | A | R-13-HR, F-03 |

## 3. Карточки доказательств (Существенные утверждения итерации 2)

### EV-120 / EV-121 — Расхождение алгоритмов владения (C-02)
**Источник:** `constructed-deckbuilder-cards.component.ts` (EV-120) и `deck-list-static.component.ts` (EV-121).
**Что доказывает:** В доноре параллельно существуют два разных алгоритма проверки владения картами. 
1. Маркер нехватки в списке колоды (`isMissing`) использует `getOwnedForDeckBuilding`, который обходит цепочку `counterpartCards` (двойников) и суммирует все версии карты.
2. Расчёт недостающей пыли (`missingDust$`) использует прямой поиск по `cardId` (`collection.find((c) => c.id === cardId)`), игнорируя двойников.
**Следствие для HDMS (DI/HR):** Это подтверждённый баг/расхождение в логике донора. В HDMS требуется единый алгоритм агрегации (R-37-HR). Тест-кейс TC-45 проверяет это расхождение.

### EV-124 / EV-125 — Форматы в UI и в логике
**Источник:** `constructed-deckbuilder-format.component.ts` (EV-124) и `constructed-deckbuilder-cards.component.ts` (EV-125).
**Что доказывает:** UI предлагает только Standard и Wild. Twist закомментирован. Однако логика фильтрации пула (`validSets`) содержит полные ветки для `classic`, `standard`, `twist` и `wild`.
**Следствие для HDMS (DI):** HDMS использует Standard (HR). Механизм переключения списков наборов из конфига пригоден для копирования, но поддержка Wild/Twist не требуется.

### EV-127 — Отсутствие Drag-and-Drop
**Источник:** Отрицательный поиск по каталогу `deckbuilder` и `package.json`.
**Что доказывает:** В Firestone DeckBuilder нет реализованного drag-and-drop для карт. Обработчики `preventDrag` служат исключительно для предотвращения нативного выделения текста или всплытия событий в DOM, а не для перетаскивания элементов.
**Следствие для HDMS (HR):** Требование Drag-and-Drop из Feature List остаётся в силе и должно быть реализовано с нуля, так как донор не предоставляет референса (R-13-HR).

### EV-126 — Deckstring Normalization (Round-trip)
**Источник:** `deck-utils.ts` (EV-126) и `copy-deckstring.component.ts`.
**Что доказывает:** Функция `sanitizeDeckDefinition`, вызываемая перед кодированием, просто возвращает входной объект `deckDefinition` без изменений. Таким образом, Firestone не выполняет собственной нормализации. Семантическая эквивалентность `encode(decode(x)) == x` полностью обеспечивается внешней библиотекой `@firestone-hs/deckstrings`.
**Статус:** Confirmed (для кода донора) / Unknown (для внутренней логики внешнего npm-пакета).

## 4. Качество доказательств и самопроверка
- Все новые утверждения (F-01…F-06) подтверждены прямым чтением исходного кода зафиксированного commit (Качество A).
- Расхождение C-02 переведено из статуса "Hypothesis/Inferred" в "Confirmed" благодаря точному чтению `missingDust$` и `inCollection`.
- Трассировка AC→TC исправлена: удалены ложные ссылки на TC-17/TC-14 для лимитов копий, добавлены TC-43…TC-46 для покрытия замечаний аудита.
- Clean-room соблюдён: внутренние имена классов и фрагменты кода не включены в спецификацию, только нейтральные описания потоков данных.
- Статус: **READY FOR REVIEW**.