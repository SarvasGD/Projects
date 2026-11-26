# Evidence Register — Функция № 2 «Визуальный конструктор колод», донор Firestone (контрольная объединённая редакция, итерация 3)

> Документ исследовательского контура. Не передаётся разработчику. Содержит только указания на источники и смысл доказательств; фрагменты исходного кода, интерфейсные тексты и графика донора не воспроизводятся. Объединяет полный реестр первой итерации, исторические доказательства второй итерации и проверенные дополнения третьей.

## 1. Паспорт исследования

| Поле | Значение |
|---|---|
| Функция / задача | Функция № 2 — визуальный конструктор колод (Constructed). Пилот, только эта функция |
| Назначенный донор | Firestone |
| Canonical URL | https://github.com/Zero-to-Heroes/firestone |
| Ветка / tag | `master` (ветка по умолчанию; tag не создавался) |
| Commit SHA | `0a30f066eb77a417637d95cec86444456f607ba1` |
| Дата коммита snapshot | 2026-02-08T20:08:36Z |
| Дата фиксации snapshot | 2026-11-17 (Asia/Shanghai) = 2026-11-16T21:15Z; повторно подтверждён тот же SHA 2026-11-17 (Asia/Shanghai) |
| Лицензионный файл / метаданные | LICENSE/COPYING в дереве snapshot отсутствуют; поле лицензии в манифесте проекта не задано; поле лицензии в метаданных репозитория пустое (EV-001, EV-002). Квалификация — не-OSS до подтверждения владельцем |
| Версия приложения | 16.12.8 (манифест проекта) |
| Дата исследования | 2026-11-17 (первая итерация); контрольная редакция — 2026-11-26 |
| Автор | Qwen (первичная деконструкция) + ChatGPT (независимое дополнение и сверка) |
| Версия спецификации | 3.0 — контрольная объединённая редакция |
| Другие доноры | Не использовались. Частный репозиторий HDMS не открывался. Исключённые источники не запрашивались |

**Фактический метод доступа (воспроизводимо):**

1. `git ls-remote https://github.com/Zero-to-Heroes/firestone HEAD` — фиксация HEAD (EV-001).
2. `git clone --depth 1 --filter=blob:none --no-checkout https://github.com/Zero-to-Heroes/firestone` — read-only клон без рабочего дерева, вне рабочего каталога проекта.
3. `git sparse-checkout init --cone` + `git sparse-checkout set <каталоги>` + `git checkout` — материализация только исследуемых каталогов: исходники оконного приложения (ветка `libs/legacy/feature-shell/src/lib/js`), модели состояния оконного приложения, библиотеки constructed / collection / game-state / settings / shared (common и framework), каталог `docs`. Дополнительно точечно `git show HEAD:<путь>` для конфигураций тестов вне sparse-набора.
4. `git rev-parse HEAD` и `git status --porcelain` — подтверждение, что прочитанные файлы соответствуют зафиксированному commit и не изменялись (пустой вывод статуса).
5. Чтение файлов с нумерацией строк (`nl -ba`), инвентаризация дерева (`git ls-tree -r --name-only HEAD`), отрицательные проверки поиском по каталогу.
6. Два внешних ресурса самого донора (конфиг наборов форматов и файл строк интерфейса) получены по URL из исходников; зафиксированы время получения, размер и префикс SHA-256 (EV-039, EV-052).
7. Самопроверка ссылок: все 91 permalink журнала и карточек автоматически сверены с деревом snapshot (существование пути и попадание диапазона строк в границы файла); выборочно 3 ссылки открыты по HTTP (код 200). Обнаруженное расхождение (диапазон строк README) исправлено до передачи.

**Чего НЕ делалось:** форков, pull request, коммитов, изменений донора; сборки и запуска приложения; запуска тестов донора; обращения к другим донорам; чтения частного репозитория HDMS; исследования исходников внешних npm-пакетов кодирования колод и справочника карт.

## 2. Журнал исследованных материалов

Все ссылки ведут на зафиксированный commit `0a30f066eb77a417637d95cec86444456f607ba1` (в таблицах сокращён до `0a30f06`). Формат permalink: `https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/<путь>#L<начало>-L<конец>`.

| Evidence ID | Путь / URL | Тип | Commit | Строки | Что проверялось | Результат наблюдения | Качество | Связанные правила / тесты |
|---|---|---|---|---|---|---|---|---|
| EV-010 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/menu-selection-decktracker.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/menu-selection-decktracker.component.ts#L56-L85) | исходный модуль | 0a30f06 | 56–85 | Точка входа в конструктор: состав меню раздела колод | В меню раздела есть отдельный пункт конструктора; переход выполняется событием смены вида; пункт не помечен как премиальный/недоступный | A | R-01, §5 ш.1; TC-01 |
| EV-011 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/decktracker.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/decktracker.component.ts#L29-L51) | исходный модуль | 0a30f06 | 29–51 | Условия отображения конструктора и наличие состояния загрузки | Конструктор отображается только для соответствующего вида раздела; блок фильтров списка колод для этого вида скрыт; весь раздел обёрнут компонентом состояния загрузки, управляемым признаком загрузки состояния раздела (строки 29, 37, 49-51, 107) | A | R-42, §8; TC-01 |
| EV-012 | [libs/constructed/common/src/lib/services/constructed-navigation.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/constructed/common/src/lib/services/constructed-navigation.service.ts#L23-L28) | исходный модуль | 0a30f06 | 23–28 | Начальный вид раздела и перечень видов | Вид по умолчанию — список колод; конструктор — один из видов того же раздела (перечень видов: строки 51-61) | A | R-01, R-39 |
| EV-013 | [libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/select-decks-view-processor.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/select-decks-view-processor.ts#L9-L24) | исходный модуль | 0a30f06 | 9–24 | Сбрасывается ли черновик при переключении вкладок раздела | Обработчик меняет только навигационное состояние; состояние конструктора не изменяется и не очищается | A | R-39, A16; TC-38 |
| EV-014 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder.component.ts#L42-L65) | исходный модуль | 0a30f06 | 42–65 | Как определяется текущий шаг мастера | Шаг выводится из черновика: нет формата → «формат», нет класса → «класс», иначе «карты»; при открытии отправляется аналитическое событие; тип шага — три значения (строка 65) | A | R-01, R-43; TC-01, TC-02 |
| EV-015 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-format.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-format.component.ts#L41-L61) | исходный модуль | 0a30f06 | 41–61 | Какие форматы предлагаются пользователю | В UI формируются ровно два варианта формата; третий вариант присутствует в списке как закомментированная (отключённая) опция (строка 45); выбор отправляет событие выбора формата | A | R-02; TC-01 |
| EV-016 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-class.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-class.component.ts#L39-L95) | исходный модуль | 0a30f06 | 39–95 | Список классов, раскладка, ограничения по формату | Классы раскладываются в 3 ряда (4/3/4); для двух «классических» форматов из списка исключаются два класса; выбор отправляет событие выбора класса | A | R-03, R-34; TC-03, TC-04, TC-37 |
| EV-017 | [libs/game-state/src/lib/services/hs-utils.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/game-state/src/lib/services/hs-utils.ts#L13-L25) | исходный модуль | 0a30f06 | 13–25 | Состав и порядок списка классов | Список содержит 11 классов в фиксированном порядке | A | R-03; TC-03 |
| EV-018 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-breadcrumbs.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-breadcrumbs.component.ts#L19-L52) | исходный модуль | 0a30f06 | 19–52 | Панель шагов: заголовки, значки, доступность импорта, возврат | Кнопка импорта отображается только когда формат не выбран; значки формата/класса появляются по мере выбора и кликабельны для возврата; заголовок шага зависит от заполненности черновика (строки 72-84) | A | R-01, R-29, R-33; TC-01, TC-36 |
| EV-019 | [libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-go-back-processor.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-go-back-processor.ts#L11-L24) | исходный модуль | 0a30f06 | 11–24 | Что именно сбрасывается при возврате назад | Сбрасывается только выбранный шаг (формат или класс); список набранных карт очищается безусловно; второй параметр выбора сохраняется; подтверждения нет | A | R-33, R-34, A3, A4, E-06, E-07; TC-36, TC-37 |
| EV-020 | [libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-format-selected-processor.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-format-selected-processor.ts#L11-L21) | исходный модуль | 0a30f06 | 11–21 | Эффект выбора формата на состояние | Записывается только формат; класс и карты не изменяются (аналогично для выбора класса — отдельный обработчик, строки 11-21 того же каталога) | A | R-01, R-34; TC-02, TC-37 |
| EV-021 | [libs/mainwindow/common/src/lib/model/decktracker/constructed-deckbuilder.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/mainwindow/common/src/lib/model/decktracker/constructed-deckbuilder.ts#L5-L13) | schema | 0a30f06 | 5–13 | Состав состояния черновика | Состояние содержит формат, класс, список идентификаторов карт и вложенные наборы; поля имени колоды в состоянии нет | A | R-31, R-39, E-03; TC-33, TC-38 |
| EV-022 | [libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/store-bootstrap.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/store-bootstrap.service.ts#L17-L55) | исходный модуль | 0a30f06 | 17–55 | Восстанавливается ли черновик при инициализации приложения | Начальное состояние раздела строится из настроек фильтров; состояние конструктора не восстанавливается из хранилища (создаётся заново значением по умолчанию, см. EV-024) | A | R-39 (Inferred для перезапуска), E-20 |
| EV-023 | [libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/main-window-store.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/main-window-store.service.ts#L562-L575) | исходный модуль | 0a30f06 | 562–575 | Подключены ли обработчики событий конструктора | Все пять обработчиков (возврат, выбор формата, выбор класса, сохранение, импорт) зарегистрированы в карте обработчиков состояния | A | §9; TC-01, TC-30, TC-33 |
| EV-024 | [libs/mainwindow/common/src/lib/model/decktracker/decktracker-state.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/mainwindow/common/src/lib/model/decktracker/decktracker-state.ts#L5-L15) | schema | 0a30f06 | 5–15 | Место состояния конструктора в состоянии раздела | Состояние конструктора создаётся как новый пустой объект по умолчанию; раздел имеет собственные признаки загрузки/готовности | A | R-39, R-42 |
| EV-030 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L207-L230) | исходный модуль | 0a30f06 | 207–230 | Предусловия и источник наборов формата при построении пула | Пул вычисляется только при наличии конфигурации, формата, класса и каталога карт; список наборов выбирается по формату из четырёх списков удалённого конфига | A | R-04, R-42, E-12, E-13; TC-05, TC-40 |
| EV-031 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L232-L263) | исходный модуль | 0a30f06 | 232–263 | Классовый фильтр пула и механика расширения класса через карту-«туриста» | Базовый пул — класс колоды + нейтральные; классы, открываемые картами-«туристами» из колоды, добавляются только для карт одного конкретного набора (имя набора зашито в условие) | A | R-05, E-22; TC-05 |
| EV-032 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L247-L264) | исходный модуль | 0a30f06 | 247–264 | Базовые фильтры пула | Оставляются только коллекционные карты из наборов формата, нужных классов, исключаются карты типа «зачарование» | A | R-04; TC-05 |
| EV-033 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L265-L286) | исходный модуль | 0a30f06 | 265–286 | Дедупликация карт с одинаковым именем | Группировка по имени; приоритет версии: единственная допустимая → версия с «двойником» → версия базового набора → первая в группе | A | R-06, E-21; TC-06 |
| EV-034 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L309-L315) | исходный модуль | 0a30f06 | 309–315 | Исключение карт на лимите и фильтр по рунам | Из пула удаляются карты, достигшие лимита копий в колоде, и карты, несовместимые с текущими рунами | A | R-08, R-20; TC-07, TC-08, TC-24, TC-25 |
| EV-035 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L551-L559) | исходный модуль | 0a30f06 | 551–559 | Правило лимита копий | Лимит достигнут при 1 копии для легендарной карты либо при ≥2 копиях для любой карты | A | R-07; TC-07, TC-08, TC-23 |
| EV-036 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L464-L482) | исходный модуль | 0a30f06 | 464–482 | Формула совместимости карты с рунами | Свободные слоты = 3 − число занятых; недостающие руны = сумма по типам max(0, требуется − занято); карта допустима, если недостающие ≤ свободные; карты без дополнительных стоимостей допустимы всегда | A | R-20, E-15, E-16; TC-24, TC-25 |
| EV-037 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/dk-runes.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/dk-runes.component.ts#L63-L134) | исходный модуль | 0a30f06 | 63–134 | Как вычисляются и когда показываются руны | Занятые руны = максимум требований по каждому типу среди карт колоды; всего 3 слота, незаполненные помечаются пустыми; панель видна только для героя нужного класса или карты-«туриста» в этот класс | A | R-20, R-21; TC-24, TC-26 |
| EV-038 | [libs/legacy/feature-shell/src/lib/js/services/decktracker/constructed-config.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/decktracker/constructed-config.service.ts#L6-L31) | исходный модуль | 0a30f06 | 6–31 | Источник правил наборов форматов | Конфигурация загружается по внешнему URL при первой подписке; до загрузки значение не определено | A | R-04, R-42, E-13; TC-40 |
| EV-040 | [libs/shared/framework/core/src/lib/services/cards-facade.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/shared/framework/core/src/lib/services/cards-facade.service.ts#L16-L68) | исходный модуль | 0a30f06 | 16–68 | Готовность каталога карт и поведение при недоступности | Ожидание готовности выполняется повторными проверками с паузами и ограниченным числом попыток; при исчерпании попыток фиксируется ошибка и обещание отклоняется; доступ к картам синхронный | A | R-42, E-13; TC-40 |
| EV-045 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L299-L304) | исходный модуль | 0a30f06 | 299–304 | Частота пересчёта поискового запроса | Поток значения поиска приводится к нижнему регистру и агрегируется с окном 50 мс | A | R-17; TC-15 |
| EV-046 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L596-L648) | исходный модуль | 0a30f06 | 596–648 | Разбор структурных токенов поиска | Обрабатывается только один структурный токен — класс; остальные фрагменты объединяются через пробел в текстовый запрос; токен ищется регулярным выражением по шаблону «имя:значение» | A | R-15, R-16; TC-17, TC-18 |
| EV-047 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L570-L594) | исходный модуль | 0a30f06 | 570–594 | Поля, по которым выполняется текстовый поиск | Совпадение по подстроке в имени, тексте карты, школе заклинаний, расах, редкости, тегах механик; отдельная ветка для расы «все»; фильтр класса применяется до текстового условия и требует точного совпадения имени класса | A | R-14, R-15; TC-15, TC-16, TC-17 |
| EV-048 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L317-L345) | исходный модуль | 0a30f06 | 317–345 | Порядок сортировки результатов и подготовка отображения | Сортировка по трём ключам: ранг класса, стоимость, имя; ранг класса — код первой буквы имени класса, для нейтральных — фиксированное большое значение (строки 561-568); результаты отображаются плитками с изображением и подсказкой | A | R-18, E-08; TC-15 |
| EV-049 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L109-L138) | исходный модуль | 0a30f06 | 109–138 | Отображение результатов и пустого состояния | Результаты выводятся виртуализированным списком с буфером 5 элементов; при пустом списке показывается компонент пустого состояния, которому передаётся только строка поиска | A | R-40, E-09, E-19; TC-19, TC-20 |
| EV-050 | [libs/legacy/feature-shell/src/lib/js/components/collection/collection-empty-state.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/collection/collection-empty-state.component.ts#L104-L130) | исходный модуль | 0a30f06 | 104–130 | Логика выбора варианта пустого состояния | Вариант выбирается по набору/фильтру коллекции или по наличию строки поиска; если ни то, ни другое не задано, селектор остаётся неопределённым и ни одна секция не отображается | A | R-40, E-09; TC-19, TC-20 |
| EV-051 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L499-L518) | исходный модуль | 0a30f06 | 499–518 | Клавиатурные сценарии в поле поиска | Enter добавляет первый результат; запрос очищается при Shift либо если единственный результат достиг лимита копий; при пустом списке результатов обработчик выходит; нажатие с Alt подавляется | A | R-41, E-17; TC-21, TC-22, TC-23 |
| EV-060 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L488-L497) | исходный модуль | 0a30f06 | 488–497 | Логика добавления карты | Если карта уже в колоде: для легендарной — отказ, при ≥2 копиях — отказ; иначе добавляется ещё одна копия в конец списка; сообщений об отказе нет | A | R-07, R-11; TC-07, TC-08 |
| EV-061 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L524-L531) | исходный модуль | 0a30f06 | 524–531 | Логика удаления карты по клику в списке колоды | Удаляется один элемент по индексу первого совпадения идентификатора; проверка наличия карты отсутствует, поэтому при отсутствии совпадения индекс = −1 и удаляется последний элемент списка (см. EV-107) | A | R-12, E-01; TC-09, TC-10 |
| EV-062 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts#L169-L213) | исходный модуль | 0a30f06 | 169–213 | Построение строк списка колоды, признак нехватки, сортировка | Строки строятся только при непустом списке карт; признак нехватки = владение (агрегированное по версиям карты) < требуемого количества; при отсутствии данных коллекции все карты считаются обеспеченными; сортировка по стоимости, затем по имени | A | R-19, R-36, R-37, E-10; TC-09, TC-28, TC-29 |
| EV-063 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts#L238-L272) | исходный модуль | 0a30f06 | 238–272 | Разбор кода колоды в строки и вложенные наборы | Код декодируется в пары (числовой id, количество); вложенные наборы привязываются к ключевой карте и отображаются отдельными подстроками, клики по ним передаются тем же обработчиком | A | R-19, R-24, E-01; TC-10, TC-32 |
| EV-064 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-card.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-card.component.ts#L163-L172) | исходный модуль | 0a30f06 | 163–172 | Отображение количества, редкости, нехватки; обработка ошибки изображения | Счётчик копий показывается при количестве >1; для легендарной выводится отдельный маркер; при нехватке — отдельный слой; при ошибке загрузки изображения плитка скрывает картинку (строки 537-546, 641-645, 686) | A | R-19, R-36, E-19; TC-09 |
| EV-065 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L347-L370) | исходный модуль | 0a30f06 | 347–370 | Минимальный и максимальный размер колоды | Оба предела равны 30, либо 40 при наличии в колоде карты-модификатора размера (проверяются два её идентификатора — исходный и переизданный) | A | R-09, E-14; TC-11, TC-13 |
| EV-066 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L372-L381) | исходный модуль | 0a30f06 | 372–381 | Критерий валидности колоды | Валидность = число карт в пределах [мин, макс] и количество каждой карты ≤2; отдельной проверки лимита легендарных, классовых запретов и рун в критерии нет | A | R-10, E-05; TC-12, TC-14 |
| EV-067 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L423-L430) | исходный модуль | 0a30f06 | 423–430 | Параметры текста прогресса набора | Текст прогресса формируется с двумя параметрами: текущее число карт и требуемый максимум | A | R-22; TC-11 |
| EV-068 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L389-L422) | исходный модуль | 0a30f06 | 389–422 | Сборка кода колоды из черновика | Карты группируются по идентификатору в пары (числовой id, количество); герой берётся по классу; формат отображается в числовой тип; вложенные наборы передаются как есть; результат кодируется внешней библиотекой | A | R-24; TC-32 |
| EV-069 | [libs/game-state/src/lib/services/hs-utils.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/game-state/src/lib/services/hs-utils.ts#L858-L886) | исходный модуль | 0a30f06 | 858–886 | Выбор героя по умолчанию для класса | Каждому из 11 классов сопоставлен фиксированный числовой id героя; при неизвестном классе пишется предупреждение и возвращается герой воина | A | R-24; TC-32 |
| EV-075 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L431-L446) | исходный модуль | 0a30f06 | 431–446 | Расчёт недостающей пыли | По каждой карте: недостающие копии = max(0, требуется − владение по точному идентификатору); умножается на стоимость создания по редкости; при отсутствии редкости вклад = 0; итоги суммируются | A | R-35, E-11; TC-27, TC-29 |
| EV-076 | [libs/game-state/src/lib/services/hs-utils.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/game-state/src/lib/services/hs-utils.ts#L800-L811) | исходный модуль | 0a30f06 | 800–811 | Стоимость создания карты по редкости | Легендарная 1600, эпическая 400, редкая 100, прочее 40 (та же таблица продублирована в утилитах коллекции — EV-078) | A | R-35; TC-27 |
| EV-077 | [libs/collection/common/src/lib/model/set.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/collection/common/src/lib/model/set.ts#L132-L149) | исходный модуль | 0a30f06 | 132–149 | Как считается владение картой коллекции | Общее владение = сумма обычных, золотых, алмазных и сигнатурных копий без ограничения; лимит коллекционирования = 1 для легендарных, иначе 2 (используется в других расчётах, не в пыли конструктора) | A | R-35, R-36; TC-27 |
| EV-078 | [libs/legacy/feature-shell/src/lib/js/services/collection/collection-utils.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/collection/collection-utils.ts#L8-L32) | исходный модуль | 0a30f06 | 8–32 | Агрегация владения по версиям карты для списка колоды | Владение суммируется по цепочке «двойников» карты с защитой от циклов; суммирование копий — обычная+золотая+алмазная+сигнатурная (модель карты, строки 3-4 в файле модели); таблица стоимости создания дублируется в строках 55-66 | A | R-36, C-02; TC-27, TC-29 |
| EV-079 | [libs/legacy/feature-shell/src/lib/js/services/collection/sets-manager.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/collection/sets-manager.service.ts#L27-L41) | исходный модуль | 0a30f06 | 27–41 | Как формируется состояние коллекции | Наборы строятся из справочника и данных коллекции с задержкой агрегации 1000 мс; отсутствующие в коллекции карты получают нулевые количества (строки 58-77) | A | R-37, E-11; TC-29 |
| EV-080 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts#L91-L116) | исходный модуль | 0a30f06 | 91–116 | Нормализация входных данных коллекции и поведение при пустом входе | Пустой или отсутствующий массив приводит к сбросу нормализованной коллекции в «неизвестно»; поддерживаются два формата входных записей | A | R-37, E-10; TC-28 |
| EV-085 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L75-L105) | исходный модуль | 0a30f06 | 75–105 | Условия видимости экспорта, сохранения, прогресса и пыли | Кнопка копирования кода и кнопка сохранения отображаются только при валидной колоде (сохранение — также при непустом коде); при невалидной колоде вместо них выводится текст прогресса; блок недостающей пыли показывается при ненулевой сумме | A | R-22, R-23, R-25; TC-11, TC-12, TC-27 |
| EV-086 | [libs/shared/common/view/src/lib/components/deck/copy-deckstring.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/shared/common/view/src/lib/components/deck/copy-deckstring.component.ts#L38-L134) | исходный модуль | 0a30f06 | 38–134 | Что именно копируется и как подтверждается копирование | Код предварительно декодируется и «нормализуется», затем кодируется обратно; строка имени добавляется только если имя передано на вход; платформенный путь копирует через сервис платформы, браузерный — через API буфера с откатом на устаревший механизм; подтверждение показывается ~2 с; при неудаче браузерного пути сообщение не выводится | A | R-25, R-43; TC-32 |
| EV-087 | [libs/shared/common/service/src/lib/services/deck-utils.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/shared/common/service/src/lib/services/deck-utils.ts#L16-L21) | исходный модуль | 0a30f06 | 16–21 | Что делает «нормализация» кода колоды в этом snapshot | Функция нормализации возвращает входное определение колоды без изменений (тождественная операция) | A | R-25; TC-32 |
| EV-088 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L533-L545) | исходный модуль | 0a30f06 | 533–545 | Побочные эффекты сохранения в интерфейсе | Отправляется событие сохранения с кодом и введённым именем; подпись кнопки меняется на подтверждение и возвращается к исходной через 2000 мс | A | R-26; TC-30 |
| EV-089 | [libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-save-deck-processor.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-save-deck-processor.ts#L18-L27) | исходный модуль | 0a30f06 | 18–27 | Состав сохраняемой записи колоды | Создаётся запись с классом и форматом из состояния, кодом и именем из события, признаком личной колоды и текущей отметкой времени; статистика/архетип не заполняются; запись передаётся в сервис личных колод | A | R-26, E-18; TC-30 |
| EV-090 | [libs/constructed/common/src/lib/services/constructed-personal-decks.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/constructed/common/src/lib/services/constructed-personal-decks.service.ts#L29-L56) | исходный модуль | 0a30f06 | 29–56 | Хранение личных колод и поведение при повторном сохранении | Список читается из локального хранилища (с обратной совместимостью со старым полем настроек) и перезаписывается при каждом изменении; при добавлении новый элемент дописывается в конец, а все элементы с тем же кодом дополнительно сливаются с новыми данными → при существующем коде получается две записи | A | R-27, R-28, E-04; TC-30, TC-31 |
| EV-091 | [libs/shared/framework/core/src/lib/services/local-storage.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/shared/framework/core/src/lib/services/local-storage.ts#L33) | исходный модуль | 0a30f06 | 33 | Ключ локального хранения личных колод; отсутствие ключа черновика | Для личных колод выделен отдельный ключ; в перечне ключей (строки 20-46) ключа черновика конструктора нет | A | R-27, R-39 |
| EV-092 | [libs/legacy/feature-shell/src/lib/js/services/decktracker/main/decks-provider.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/decktracker/main/decks-provider.service.ts#L274-L291) | исходный модуль | 0a30f06 | 274–291 | Как сохранённая колода попадает в список колод | Личные колоды без сыгранных матчей добавляются в список отдельно: исключаются уже сыгранные и удалённые, фильтруются по формату, получают нулевую статистику; в компоненте списка они проходят фильтр «есть матчи либо личная» (строка 108 соответствующего компонента) | A | R-26, §9; TC-30 |
| EV-093 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-breadcrumbs.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-breadcrumbs.component.ts#L128-L132) | исходный модуль | 0a30f06 | 128–132 | Источник данных импорта | Содержимое читается из буфера обмена платформенным сервисом, разбирается общей функцией разбора и отправляется событием импорта; файлового ввода нет | A | R-29, R-30; TC-33 |
| EV-094 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/import-deckstring.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/import-deckstring.component.ts#L98-L122) | исходный модуль | 0a30f06 | 98–122 | Правила разбора содержимого буфера обмена | Строки просматриваются в обратном порядке; имя — первая с конца строка с префиксом из трёх решёток и пробела; код — первая с конца строка, которую удалось декодировать; ошибки декодирования отдельных строк подавляются; цикл завершается при находке обоих значений | A | R-30; TC-33, TC-35 |
| EV-095 | [libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-import-deck-processor.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-import-deck-processor.ts#L16-L41) | исходный модуль | 0a30f06 | 16–41 | Эффект импорта и обработка ошибки декодирования | При ошибке декодирования пишется предупреждение в журнал и состояние не меняется (возврат пустого результата); при успехе формат берётся из кода, класс — по герою, карты разворачиваются в список копий, вложенные наборы сохраняются; имя из события не используется | A | R-31, R-32, E-02, E-03, A17; TC-33, TC-34, TC-40 |
| EV-096 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/import-deckstring.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/import-deckstring.component.ts#L61-L85) | исходный модуль | 0a30f06 | 61–85 | Наличие пользовательской ошибки импорта в другом компоненте | В компоненте импорта оверлея при нераспознанном содержимом меняется диалог подтверждения на сообщение о невалидном коде; в конструкторе такой диалог не используется | A | R-32, C-03; TC-34 |
| EV-100 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L190-L200) | исходный модуль | 0a30f06 | 190–200 | Влияние настроек на отображение | Показ связанных карт в подсказках берётся из настройки; размер плитки = базовый размер × (масштаб/100); значения по умолчанию: масштаб 100, показ связанных карт включён (модель настроек, строки 157 и 166) | A | R-38; TC-39 |
| EV-101 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L28-L29) | исходный модуль | 0a30f06 | 28–29 | Базовые размеры плитки карты | Заданы две константы базовой ширины и высоты, используемые при масштабировании (строки 120-121 шаблона) | A | R-38; TC-39 |
| EV-102 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-format.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-format.component.ts#L15-L26) | исходный модуль | 0a30f06 | 15–26 | Элементы доступности на шагах выбора | Варианты формата и класса оформлены как кнопки с ролью элемента списка и табиндексом 0 (аналогично в компоненте класса, строки 18-33); в рабочей области сетка карт кликабельна без явной клавиатурной навигации | A | §13 (доступность), TC-21 |
| EV-103 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L36-L66) | исходный модуль | 0a30f06 | 36–66 | Поле имени и поле поиска | Имя — обычное поле ввода со значением по умолчанию из локализации, без валидации/ограничения длины; поиск — поле с автофокусом, подсказкой по горячим клавишам и подавлением всплытия событий мыши (строки 520-522, 547-549) | A | R-26, E-18; TC-30 |
| EV-105 | [libs/constructed/common/src/lib/services/constructed-personal-decks.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/constructed/common/src/lib/services/constructed-personal-decks.service.ts#L58-L102) | исходный модуль | 0a30f06 | 58–102 | Где выполняется удаление сохранённых колод | Удаление реализовано в сервисе личных колод (с учётом связанных версий и дат удаления) и вызывается вне конструктора; в конструкторе операций удаления/переименования сохранённых колод нет | A | §2 (границы) |
| EV-106 | [libs/legacy/feature-shell/src/lib/js/services/utils.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/utils.ts#L112-L123) | исходный модуль | 0a30f06 | 112–123 | Семантика сравнения при сортировке | Сравнение идёт по очереди ключей до первого различия; при равенстве всех ключей возвращается 0 (порядок равных элементов определяется устойчивостью сортировки платформы) | A | R-18, R-19, E-08 |
| EV-108 | [libs/shared/common/service/src/lib/models/preferences.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/shared/common/service/src/lib/models/preferences.ts#L157-L166) | schema | 0a30f06 | 157–166 | Значения по умолчанию для настроек отображения карточек | Масштаб карточек по умолчанию 100; показ связанных карт по умолчанию включён; окраска стоимости по редкости по умолчанию включена (строка 285) | A | R-38; TC-39 |
| EV-109 | [libs/shared/framework/common/src/lib/components/abstract-subscription.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/shared/framework/common/src/lib/components/abstract-subscription.component.ts#L18-L34) | исходный модуль | 0a30f06 | 18–34 | Смысл третьего параметра mapData (окно агрегации) | Поток пропускается через оконную агрегацию с заданной длительностью (по умолчанию 100 мс), затем отображение, отсечение повторов и отметка перерисовки; то есть это окно, а не «сброс таймера при каждом вводе» | A | R-17; TC-15 |
| EV-110 | [libs/shared/common/view/src/lib/components/loading/with-loading.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/shared/common/view/src/lib/components/loading/with-loading.component.ts#L9-L23) | исходный модуль | 0a30f06 | 9–23 | Что показывает секционный индикатор загрузки | При признаке загрузки содержимое скрывается и отображается отдельное состояние загрузки с заголовком/подзаголовком; переходы анимированы | A | R-42 |
| EV-111 | [libs/app/common/src/lib/services/localization-loader.service.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/app/common/src/lib/services/localization-loader.service.ts#L8-L45) | исходный модуль | 0a30f06 | 8–45 | Откуда берутся строки интерфейса | Строки загружаются с внешнего основного URL с резервным URL и кешируются на диск; в репозитории самих текстов нет | A | §15 (Unknown по текстам), C-01 |
| EV-112 | [libs/legacy/feature-shell/src/lib/js/models/decktracker/constructed-config.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/models/decktracker/constructed-config.ts#L1-L6) | schema | 0a30f06 | 1–6 | Структура конфигурации форматов | Конфигурация содержит четыре списка наборов: стандартный, «классический», вольный, twist | A | R-02, R-04; TC-40 |
| EV-113 | [libs/constructed/common/src/lib/models/deck-summary.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/constructed/common/src/lib/models/deck-summary.ts#L3-L21) | schema | 0a30f06 | 3–21 | Полный состав записи колоды в списке | Запись содержит код, имя, архетип, класс, скин, статистику, формат, признак личной колоды, версии и список карт; конструктор заполняет лишь часть полей | A | R-26; TC-30 |
| EV-114 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/decktracker-decks.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/decktracker-decks.component.ts#L107-L120) | исходный модуль | 0a30f06 | 107–120 | Условие попадания личной колоды в отображаемый список | В список попадают колоды с сыгранными матчами либо помеченные как личные; далее применяются фильтры класса, поиска и карт | A | R-26; TC-30 |
| EV-115 | [libs/legacy/feature-shell/src/lib/js/models/card.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/models/card.ts#L3-L4) | исходный модуль | 0a30f06 | 3–4 | Как суммируются копии карты коллекции | Сумма обычной, золотой, алмазной и сигнатурной копий; при отсутствии записи — 0 | A | R-36; TC-27 |
| EV-116 | [libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/events/decktracker/constructed-deckbuilder-import-deck-event.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/events/decktracker/constructed-deckbuilder-import-deck-event.ts#L8-L11) | исходный модуль | 0a30f06 | 8–11 | Состав данных событий конструктора | Событие импорта несёт код и имя; событие сохранения — код и имя; событие возврата — целевой шаг; события выбора — формат/класс. Все пять событий не являются навигационными и не сбрасывают историю | A | §9; TC-33, TC-36 |
| EV-117 | [libs/legacy/feature-shell/src/lib/css/component/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.scss](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/css/component/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.scss) | исходный модуль (стили) | 0a30f06 | выборочно (см. наблюдение) | Наличие визуальных состояний в стилях рабочей области (выборочный поиск по ключевым словам) | В стилях присутствуют правила для наведения, блока недостающей пыли и текстового курсора (совпадения на строках 29, 71, 78, 102, 111); полная визуальная композиция не анализировалась и не переносится | C | §13 (Out of scope: визуальный стиль) |
| EV-118 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L382-L398) | исходный модуль | 0a30f06 | 382–398 | Откуда берутся вложенные наборы (sideboards) в конструкторе | Вложенные наборы только читаются из состояния (заполняются импортом) и передаются в код колоды; в каталоге конструктора нет обработчиков создания/редактирования вложенных наборов (отрицательная проверка поиском по каталогу) | A | §13 (Not found: редактирование вложенных наборов), E-23; TC-41 |
| EV-119 | [libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts#L196-L199) | исходный модуль | 0a30f06 | 196–199 | Отображаемая стоимость модульной карты | Для одной конкретной модульной карты отображаемая стоимость вычисляется как сумма стоимостей её вложенных карт, для остальных берётся справочная стоимость — частный случай, зашитый в код | A | E-23; TC-42 |
| EV-001 | https://api.github.com/repos/Zero-to-Heroes/firestone + `git ls-remote https://github.com/Zero-to-Heroes/firestone HEAD` + локальный read-only клон | метаданные репозитория | получено 2026-11-16T21:15Z | не применимо | Фиксация ветки, commit SHA и даты snapshot | Ветка по умолчанию — master; HEAD = 0a30f066eb77a417637d95cec86444456f607ba1; дата коммита 2026-02-08T20:08:36Z; репозиторий не архивирован; поле лицензии в метаданных пустое. Повторная проверка при продолжении работы дала тот же SHA | A | Паспорт обоих документов |
| EV-002 | [package.json](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/package.json#L3) (версия), [package.json](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/package.json#L104-L108) (внешние карточные пакеты); инвентаризация дерева: `git ls-tree -r --name-only HEAD \| grep -iE "license\|copying\|copyright"` | манифест + инвентаризация дерева | 0a30f06 | 3, 104, 108; дерево целиком | Лицензионный статус и версии внешних карточных зависимостей | Файлов LICENSE/COPYING/COPYRIGHT в дереве snapshot нет; поле лицензии в манифесте отсутствует; версия приложения 16.12.8; кодирование кода колоды и справочник карт подключаются как внешние пакеты (версии ^2.2.8 и ^3.0.167) | A | Паспорт; §15 (границы донора) |
| EV-003 | Инвентаризация дерева: `git ls-tree -r --name-only HEAD \| grep -E "\.(spec\|test)\.(ts\|js\|tsx)$"`; [jest.config.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/jest.config.ts#L1-L5); [libs/legacy/feature-shell/jest.config.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/jest.config.ts#L1-L22); [libs/legacy/feature-shell/project.json](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/project.json#L24-L30); [libs/constructed/common/jest.config.ts](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/constructed/common/jest.config.ts#L1-L22) | тестовая инфраструктура + инвентаризация | 0a30f06 | см. указанные диапазоны | Есть ли автоматизированные тесты конструктора колод | Всего 30 тестовых файлов на репозиторий: 1 в Electron-приложении, 2 в счётчиках игрового состояния, 27 в требованиях достижений. Ни один путь не относится к конструктору/колодам/коду колоды. Тестовая цель библиотеки настроена как «проходить при отсутствии тестов». Тесты не запускались | A | §13 (Not found), §15; все TC имеют статус Not executed |
| EV-004 | [README.md](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/README.md#L1-L24) | README | 0a30f06 | 1-24 | Контекст продукта и ссылки на документацию | Приложение — companion для игры, работающий на платформе Overwolf; описание функций вынесено во внешнюю wiki (не исследовалась) | B | §2 (контекст) |
| EV-005 | [docs/errors/no-cards/enUS.md](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/docs/errors/no-cards/enUS.md#L1-L12) | документация | 0a30f06 | 1-12 | Документированное поведение при недоступности карточной базы | Документ описывает критическую ошибку загрузки базы карт и причины (блокировки сети/антивирус/родительский контроль), то есть недоступность каталога — известный сценарий отказа | B | E-13; TC-40 |
| EV-006 | https://api.github.com/repos/Zero-to-Heroes/firestone/commits?path=libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts&per_page=5 | история изменений (API) | получено 2026-11-16T21:20Z | не применимо | Насколько свежа логика конструктора | Последние 5 изменений файла: 2026-02-08 (перенос сервисов/моделей в общую библиотеку), 2026-01-26 (первичная Electron-сборка), 2026-01-01 (замена вызовов перерисовки), 2025-07-28 (обновление фреймворка), 2024-10-14 (исправление учёта переизданной карты-модификатора размера). То есть последнее содержательное изменение правил — 2024-10-14 | B | §15 (актуальность), R-09 |
| EV-039 | https://static.firestoneapp.com/data/constructed-config.json (URL из EV-038) | пример данных (внешний ресурс донора) | получено 2026-11-16T21:19:50Z; 1498 байт; SHA-256 (префикс) 2c23d1ea4b7e235b | JSON целиком | Фактическое наполнение списков наборов форматов | Четыре ключа, соответствующие модели: стандартный — 13 наборов, вольный — 63, «классический» — 1, twist — 0 (пустой список). Данные не привязаны к commit и могут измениться | B | R-04, E-12; TC-40 |
| EV-052 | https://static.firestoneapp.com/data/i18n/enUS.json (URL из EV-111), поддерево ключей подсказки поиска конструктора | пример данных (внешний ресурс донора) | получено 2026-11-16T21:19:50Z; 431338 байт; SHA-256 (префикс) 12c0096f91def014 | поддерево ключей подсказки поиска | Какие сценарии поиска обещаны пользователю (структурная проверка без копирования текстов) | В поддереве 5 ключей: вводный и четыре подсказки. Первая содержит упоминание клавиши Enter, вторая — Enter и Shift, третья — токен класса, четвёртая — токен, относящийся к другому режиму (bucket). Компонент конструктора выводит только три подсказки (шаблон подсказки в компоненте рабочей области, строки 448-457). Тексты сознательно не цитируются | B | R-16, R-41, C-01; TC-17, TC-18, TC-21, TC-22 |
| EV-104 | Отрицательные проверки в каталоге конструктора: `grep -rniE "isloading\|spinner\|loading\|skeleton"`, `grep -rn "mana-curve"`, `grep -rniE "drag\|drop\|undo\|redo\|replace"` по всем файлам каталога libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/ | отрицательная проверка (поиск по каталогу) | 0a30f06 | каталог целиком (5 файлов) | Есть ли в конструкторе мана-кривая, свои состояния загрузки, undo/redo, замена карты, drag-and-drop | Совпадений по мана-кривой, состояниям загрузки и undo/redo/replace нет; по drag найдены только два места подавления всплытия событий мыши (поле имени и поле поиска), реализации перетаскивания нет | A | R-13, R-42, §2 (границы), §13 |
| EV-107 | Локальная микропроверка семантики языка в песочнице: `node -e` со массивом из 3 элементов, поиском отсутствующего элемента и удалением по найденному индексу | проверка семантики языка (НЕ тест донора) | выполнено 2026-11-16T21:22Z | не применимо | Что происходит при удалении по индексу отсутствующего элемента | Поиск отсутствующего элемента возвращает −1; удаление одного элемента по индексу −1 удаляет последний элемент массива. Это подтверждает механизм дефекта E-01, но не является наблюдением поведения приложения | A | E-01; TC-10 |

### 2.1. Инвентаризация тестовых файлов snapshot (доказательство отрицательного результата EV-003)

Полный список путей, полученных из дерева зафиксированного commit по шаблону `*.spec.ts` / `*.test.ts` (30 файлов):

| Группа | Кол-во | Пути (префикс) | Отношение к функции № 2 |
|---|---|---|---|
| Тест сервиса журнала Electron-приложения | 1 | `apps/electron-app/src/app/services/` | нет |
| Тесты счётчиков игрового состояния | 2 | `libs/game-state/src/lib/counters/impl/` | нет |
| Тесты требований достижений (в т.ч. одно достижение Battlegrounds) | 27 | `libs/legacy/feature-shell/src/lib/js/services/achievement/achievements/requirements/` | нет |
| Тесты конструктора колод, кода колоды, личных колод, пула карт, поиска, валидации | **0** | — | **Not found** |

Дополнительно проверено: в каталоге конструктора (5 файлов) нет ни одного тестового файла; тестовые конфигурации библиотек существуют, но цель тестирования библиотеки оконного приложения допускает отсутствие тестов (`passWithNoTests`). Вывод: **автоматизированное тестовое покрытие функции № 2 у донора отсутствует**, поэтому ни один тест-кейс спецификации не может иметь статус «Confirmed by test».

### 2.2. Исторические дополнения второй итерации

| ID | Источник | Строки | Содержание и статус |
|---|---|---:|---|
| EV-120 | constructed-deckbuilder-cards.component.ts | 431–446 | Пыль по точному ID; подтверждено |
| EV-121 | deck-list-static.component.ts; collection-utils.ts | 183–213; 8–32 | Маркер агрегирует альтернативные версии; подтверждено |
| EV-122 | sets-manager.service.ts | 27–40 | null/undefined нормализуются через ?? []; подтверждено |
| EV-123 | deck-list-static.component.ts | 91–115 | Пустой вход переводит внутреннюю коллекцию в null; подтверждено |
| EV-124 | constructed-deckbuilder-format.component.ts | 41–53 | UI Standard/Wild, Twist отключён; подтверждено |
| EV-125 | constructed-deckbuilder-cards.component.ts | 223–230 | Ветви выбора наборов для форматов; не доказывает полноту поддержки |
| EV-126 | libs/shared/common/service/src/lib/services/deck-utils.ts | 1–21 | Предобработка определения колоды тождественна; гарантии внешней библиотеки Unknown |
| EV-127 | Каталог deckbuilder и package.json | исследованный каталог | Drag-and-drop не обнаружен в указанном объёме; отрицательный вывод требует воспроизводимого перечня файлов |

### 2.3. Дополнения третьей итерации

| ID | Источник | Строки | Что подтверждает | Качество |
|---|---|---:|---|---|
| EV-128 | base-is.ts | 10 | Начальное значение потока коллекции — null | A |
| EV-129 | collection-manager.service.ts; sets-manager.service.ts | 125; 27–40 | Передача потока, первая подписка, debounceTime(1000), nullish-нормализация | A |
| EV-130 | sets-manager.service.ts | 43–76 | Полный каталог; точный ID; четыре нулевых счётчика при отсутствии записи | A |
| EV-131 | constructed-deckbuilder-cards.component.ts | 291–297 | Разворот наборов в плоский список | A |
| EV-132 | constructed-deckbuilder-cards.component.ts | 68–76 | Передача списка во вход collection дочернего списка | A |
| EV-133 | deck-list-static.component.ts | 91–115 | Пустой вход → внутренний null; непустой каталог → словарь счётчиков | A |
| EV-134 | deck-list-static.component.ts | 183–213 | Маркер нехватки и неизвестное состояние | A |
| EV-135 | collection-utils.ts | 8–32 | Агрегация владения по альтернативным версиям | A |
| EV-136 | constructed-deckbuilder-cards.component.ts | 431–446 | Независимая пыль по точному ID | A |
| EV-137 | hs-utils.ts | 800–811 | Стоимость обычного создания 40/100/400/1600 | A |

## 3. Карточки доказательств (существенные утверждения)

### EV-014 — Шаг мастера определяется заполненностью черновика (формат → класс → карты), отдельного шага сохранения нет.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L42–L65
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder.component.ts#L42-L65
- **Что именно доказывает источник:** Порядок и условие переключения шагов; трёхзначный тип шага; отправка аналитического события при открытии.
- **Что он не доказывает:** Не доказывает наличие анимаций переходов, поведение при прямом URL-переходе и сохранение шага между запусками.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-01, §5, §8; TC-01, TC-02

### EV-015 — Пользователю предлагаются ровно два формата; третий присутствует в коде как отключённая опция.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-format.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L41–L61
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-format.component.ts#L41-L61
- **Что именно доказывает источник:** Состав выбираемых форматов на шаге 1 и факт отключённой третьей опции (строка 45).
- **Что он не доказывает:** Не доказывает, что другие форматы не поддерживаются логикой пула/импорта — это подтверждается отдельно (EV-030, EV-095).
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-02; TC-01, TC-04

### EV-016 — Для двух «классических» форматов из списка классов исключаются два класса; остальные 11 доступны.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-class.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L66–L95
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-class.component.ts#L66-L95
- **Что именно доказывает источник:** Условие фильтрации классов по формату и раскладку по рядам (строки 39-55).
- **Что он не доказывает:** Не доказывает, что уже выбранный класс сбрасывается при смене формата (наоборот — EV-019).
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-03, R-34, E-07; TC-03, TC-04, TC-37

### EV-030 — Пул строится только при готовых предусловиях и использует список наборов выбранного формата из внешней конфигурации.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L207–L230
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L207-L230
- **Что именно доказывает источник:** Набор предусловий (конфиг, формат, класс, каталог) и выбор одного из четырёх списков наборов.
- **Что он не доказывает:** Не доказывает содержимое списков наборов (это внешние данные, EV-039) и наличие UI-состояния загрузки.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-04, R-42, E-12; TC-05, TC-40

### EV-031 — Карты-«туристы» расширяют пул другим классом, но только картами одного конкретного набора.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L232–L263
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L232-L263
- **Что именно доказывает источник:** Механику расширения классов и жёсткое ограничение по имени набора в условии фильтра.
- **Что он не доказывает:** Не доказывает полноту поддержки всех карт-«туристов» и корректность для будущих наборов.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-05, E-22; TC-05

### EV-033 — Карты с одинаковым именем сворачиваются в одну запись пула по детерминированной цепочке приоритетов.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L265–L286
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L265-L286
- **Что именно доказывает источник:** Порядок приоритетов выбора версии карты и наличие fallback на первый элемент группы.
- **Что он не доказывает:** Не доказывает, какая именно версия будет выбрана в спорных случаях: порядок зависит от внешнего справочника карт.
- **Статус:** Confirmed (правило) / Hypothesis (результат в спорных случаях)
- **Связанные разделы спецификации и Test ID:** R-06, E-21; TC-06

### EV-035 — Лимит копий: 1 для легендарной карты, 2 для остальных.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L551–L559
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L551-L559
- **Что именно доказывает источник:** Точное условие достижения лимита, используемое и при добавлении, и при фильтрации пула.
- **Что он не доказывает:** Не доказывает, что этот же лимит проверяется в критерии валидности колоды (там только «≤2», EV-066).
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-07, R-08; TC-07, TC-08, TC-23

### EV-060 — Добавление карты молча игнорируется при достигнутом лимите; иначе добавляется одна копия.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L488–L497
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L488-L497
- **Что именно доказывает источник:** Отсутствие сообщения об отказе и порядок добавления (в конец списка).
- **Что он не доказывает:** Не доказывает наличие анимации/подсветки добавления и поведение при очень быстрых повторных кликах.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-11; TC-07, TC-08

### EV-061 — Удаление карты выполняется по индексу первого совпадения без проверки наличия; при отсутствии карты удаляется последняя запись колоды.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L524–L531
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L524-L531
- **Что именно доказывает источник:** Отсутствие проверки результата поиска и использование индекса напрямую; вместе с EV-063 (клики по вложенным картам приходят тем же обработчиком) и EV-107 (семантика языка) даёт механизм дефекта.
- **Что он не доказывает:** Не является наблюдением бага в работающем приложении: рантайм не запускался. Не доказывает, что дефект воспроизводится во всех сборках.
- **Статус:** Confirmed (по коду) / Hypothesis (наблюдаемое проявление)
- **Связанные разделы спецификации и Test ID:** R-12, E-01; TC-09, TC-10

### EV-065 — Требуемый размер колоды 30, либо 40 при наличии карты-модификатора размера (учитываются два её идентификатора).

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L347–L370
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L347-L370
- **Что именно доказывает источник:** Равенство минимума и максимума и условие повышения до 40 по двум идентификаторам карты.
- **Что он не доказывает:** Не доказывает поддержку иных модификаторов размера и не раскрывает сами идентификаторы (внешний справочник карт).
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-09, E-14; TC-11, TC-13

### EV-066 — Валидность колоды проверяет только размер и «не более 2 копий каждой карты».

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L372–L381
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L372-L381
- **Что именно доказывает источник:** Полный состав критерия валидности; отсутствие проверки легендарного лимита, классовых запретов, рун и запретов формата.
- **Что он не доказывает:** Не доказывает, что невалидные по игровым правилам колоды невозможны: вручную лимиты блокируются, но импорт может их обойти.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-10, E-05; TC-12, TC-14

### EV-036 — Совместимость карты с рунами: недостающие руны (сумма по типам) не должны превышать число свободных слотов из трёх.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L464–L482
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L464-L482
- **Что именно доказывает источник:** Точную формулу и то, что карты без дополнительных стоимостей проходят всегда.
- **Что он не доказывает:** Не доказывает поведение при импорте колоды, где требования превышают 3 слота (панель просто отображает занятые руны, EV-037).
- **Статус:** Confirmed (формула) / Unknown (импорт с перегрузкой рун)
- **Связанные разделы спецификации и Test ID:** R-20, E-15, E-16; TC-24, TC-25

### EV-037 — Занятые руны вычисляются как максимум требований по каждому типу среди карт колоды; панель видна только для соответствующего класса или «туриста».

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/dk-runes.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L63–L134
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/dk-runes.component.ts#L63-L134
- **Что именно доказывает источник:** Алгоритм заполнения 3 слотов, условие видимости панели и передачу рун наружу через событие.
- **Что он не доказывает:** Не доказывает интерактивность панели (в конструкторе она отображается, а не выбирается пользователем).
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-20, R-21; TC-24, TC-26

### EV-046 — В поиске поддерживается единственный структурный токен — класс; остальные фрагменты становятся текстовым запросом.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L596–L648
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L596-L648
- **Что именно доказывает источник:** Список обработчиков токенов (один) и объединение нераспознанных фрагментов через пробел.
- **Что он не доказывает:** Не доказывает поддержку числовых или иных токенов; внешние подсказки упоминают токен другого режима (EV-052).
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-15, R-16, C-01; TC-17, TC-18

### EV-047 — Текстовый поиск — регистронезависимая подстрока по имени, тексту, школе заклинаний, расам, редкости и тегам механик.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L570–L594
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L570-L594
- **Что именно доказывает источник:** Полный перечень полей и ветку для расы «все»; фильтр класса требует точного совпадения имени класса.
- **Что он не доказывает:** Не доказывает поиск по числовым характеристикам, по имени набора или по «имеющимся в коллекции».
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-14, R-15; TC-15, TC-16, TC-17

### EV-048 — Сортировка результатов: ранг класса (нейтральные в конце) → стоимость → имя; ранг класса грубый (код первой буквы).

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L561–L568
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L561-L568
- **Что именно доказывает источник:** Способ вычисления ранга класса и отдельное значение для нейтральных; ключи сортировки заданы в строках 317-345.
- **Что он не доказывает:** Не доказывает детерминированный порядок разных классов с одинаковой первой буквой; сравнение по ключам — EV-106.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-18, E-08; TC-15

### EV-051 — Enter добавляет первый результат; Shift+Enter очищает запрос; запрос очищается и при единственном результате на лимите.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L499–L518
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L499-L518
- **Что именно доказывает источник:** Клавиатурные сценарии и условие автоочистки; ранний выход при пустом списке результатов.
- **Что он не доказывает:** Не доказывает наличие клавиатурной навигации по сетке карт и других горячих клавиш.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-41, E-17; TC-21, TC-22, TC-23

### EV-050 — При пустом результате и пустом поиске область результатов остаётся без сообщения.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/collection/collection-empty-state.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L119–L130
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/collection/collection-empty-state.component.ts#L119-L130
- **Что именно доказывает источник:** Что селектор варианта пустого состояния сбрасывается и остаётся неопределённым, если не заданы набор/фильтр/поиск; в конструкторе передаётся только поиск (EV-049).
- **Что он не доказывает:** Не доказывает визуальный вид области (стили не анализировались полностью).
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-40, E-09; TC-19, TC-20

### EV-075 — Недостающая пыль считается по точному идентификатору карты и таблице стоимости создания по редкости.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L431–L446
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L431-L446
- **Что именно доказывает источник:** Формулу расчёта, отсутствие ограничения владения лимитом и нулевой вклад при неизвестной редкости.
- **Что он не доказывает:** Не доказывает согласованность с отметками нехватки в списке колоды — там другой алгоритм (EV-062, EV-078).
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-35, C-02; TC-27, TC-29

### EV-062 — Отметка «не хватает» в списке колоды использует агрегированное владение по версиям карты; при неизвестной коллекции все карты считаются обеспеченными.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L183–L213
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts#L183-L213
- **Что именно доказывает источник:** Условие признака нехватки и ветку «коллекция неизвестна»; сортировку строк по стоимости и имени.
- **Что он не доказывает:** Не доказывает, что пользователь видит предупреждение о неизвестной коллекции.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-36, R-37, E-10, C-02; TC-28, TC-29

### EV-085 — Копирование кода и сохранение доступны только при валидной колоде; иначе показывается текст прогресса.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L75–L105
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L75-L105
- **Что именно доказывает источник:** Условия отображения обеих кнопок, текста прогресса и блока недостающей пыли; отсутствие передачи имени колоды в компонент копирования.
- **Что он не доказывает:** Не доказывает доступность кнопок с клавиатуры и наличие подсказок о причине блокировки.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-22, R-23, R-25; TC-11, TC-12

### EV-087 — «Нормализация» кода колоды перед экспортом в этом snapshot ничего не изменяет.

- **Источник и точный путь:** `libs/shared/common/service/src/lib/services/deck-utils.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L16–L21
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/shared/common/service/src/lib/services/deck-utils.ts#L16-L21
- **Что именно доказывает источник:** Тождественность операции нормализации, то есть экспортируется построенный код без преобразований.
- **Что он не доказывает:** Не доказывает, что нормализация не выполняется внутри внешней библиотеки кодирования.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-25; TC-32

### EV-090 — Повторное сохранение колоды с существующим кодом приводит к двум записям с одинаковым кодом.

- **Источник и точный путь:** `libs/constructed/common/src/lib/services/constructed-personal-decks.service.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L50–L56
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/constructed/common/src/lib/services/constructed-personal-decks.service.ts#L50-L56
- **Что именно доказывает источник:** Логику «дописать новый элемент и слить все элементы с тем же кодом»; хранение списка в локальном хранилище (строки 29-48).
- **Что он не доказывает:** Не доказывает, что дубли отображаются пользователю как две строки: отображение списка фильтруется и агрегируется в соседнем сервисе (EV-092, EV-114). Рантайм не проверялся.
- **Статус:** Confirmed (логика) / Hypothesis (проявление в UI)
- **Связанные разделы спецификации и Test ID:** R-27, R-28, E-04; TC-30, TC-31

### EV-094 — Разбор буфера идёт с конца строк: имя — по префиксу, код — по успешному декодированию.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/components/decktracker/import-deckstring.component.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L98–L122
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/import-deckstring.component.ts#L98-L122
- **Что именно доказывает источник:** Порядок просмотра, критерии имени и кода, подавление ошибок декодирования отдельных строк, условие выхода из цикла.
- **Что он не доказывает:** Не доказывает поведение самой функции декодирования (внешняя библиотека) и поддержку иных форматов обмена.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-30; TC-33, TC-35

### EV-095 — Импорт применяет формат/класс/карты из кода; имя из буфера теряется; при ошибке декодирования состояние не меняется и сообщение не показывается.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-import-deck-processor.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L16–L41
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-import-deck-processor.ts#L16-L41
- **Что именно доказывает источник:** Все эффекты импорта, отсутствие использования имени и молчаливый отказ при ошибке.
- **Что он не доказывает:** Не доказывает валидацию импортированной колоды по правилам формата (её нет) и наличие UI-ошибки в конструкторе (EV-096 показывает, что диалог ошибки существует лишь в другом компоненте).
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-31, R-32, E-02, E-03; TC-33, TC-34

### EV-019 — Возврат на предыдущий шаг безусловно очищает набранные карты и сохраняет второй параметр выбора.

- **Источник и точный путь:** `libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-go-back-processor.ts`
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** L11–L24
- **Permalink:** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/mainwindow/store/processors/decktracker/constructed-deckbuilder-go-back-processor.ts#L11-L24
- **Что именно доказывает источник:** Что очищаются карты, какой параметр сбрасывается, а какой сохраняется; отсутствие подтверждения.
- **Что он не доказывает:** Не доказывает наличие механизма отмены или восстановления очищенной колоды.
- **Статус:** Confirmed
- **Связанные разделы спецификации и Test ID:** R-33, R-34, E-06, E-07; TC-36, TC-37

### EV-003 — Автоматизированных тестов функции № 2 в репозитории нет.

- **Источник:** инвентаризация дерева зафиксированного commit (`git ls-tree -r --name-only HEAD`, фильтр по `*.spec.ts` / `*.test.ts`), конфигурации тестов: `jest.config.ts` (L1–L5), `libs/legacy/feature-shell/jest.config.ts` (L1–L22), `libs/legacy/feature-shell/project.json` (L24–L30), `libs/constructed/common/jest.config.ts` (L1–L22)
- **Commit SHA:** `0a30f066eb77a417637d95cec86444456f607ba1`
- **Строки:** указаны выше для конфигураций; для инвентаризации — дерево целиком (30 совпадений, перечень в § 2.1)
- **Permalink (пример конфигурации):** https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/project.json#L24-L30
- **Что именно доказывает источник:** Инвентаризация всех 30 тестовых файлов дерева snapshot: ни один не относится к конструктору, коду колоды, личным колодам, пулу, поиску или валидации; тестовая цель библиотеки допускает отсутствие тестов.
- **Что он не доказывает:** Не доказывает отсутствие ручного тестирования у донора и не оценивает качество тестов в других областях.
- **Статус:** Confirmed (отрицательный результат)
- **Связанные разделы спецификации и Test ID:** §13, §15; все TC — Not executed

### Карточки доказательств второй и третьей итераций

#### EV-120 — Пыль по точному ID
Источник: [constructed-deckbuilder-cards.component.ts, L431-L446](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L431-L446). Расчёт missing dust использует точный ID; альтернативные версии не агрегируются. Не доказывает логику маркера. Качество A; R-35, C-02, TC-45.

#### EV-121 — Маркер по альтернативным версиям
Источники: [deck-list-static.component.ts, L183-L213](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts#L183-L213); [collection-utils.ts, L8-L32](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/collection/collection-utils.ts#L8-L32). Маркер агрегирует альтернативные версии; не доказывает такой же алгоритм для пыли. Качество A; R-36, C-02, TC-45.

#### EV-122 — Нормализация источника коллекции
Источник: [sets-manager.service.ts, L27-L40](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/collection/sets-manager.service.ts#L27-L40). null/undefined заменяются на []; начальное значение источника отдельно подтверждено EV-128. Качество A; R-47, E-27.

#### EV-123 — Нормализация входа дочернего списка
Источник: [deck-list-static.component.ts, L91-L115](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts#L91-L115). Пустой вход сбрасывает внутреннюю коллекцию в null; это не исходный null CollectionManager. Качество A; R-37, E-26.

#### EV-124 — Форматы в интерфейсе
Источник: [constructed-deckbuilder-format.component.ts, L41-L53](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-format.component.ts#L41-L53). UI предлагает Standard и Wild; Twist закомментирован. Не доказывает поддержку форматов HDMS. Качество A; R-02.

#### EV-125 — Кодовые ветви выбора наборов
Источник: [constructed-deckbuilder-cards.component.ts, L223-L230](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L223-L230). Подтверждает наличие ветвей форматов, но не полноту поддержки без внешнего конфига. Качество A для ветвей, B для фактической полноты.

#### EV-126 — Тождественная предварительная обработка определения колоды
Источник: [deck-utils.ts, L1-L21](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/shared/common/service/src/lib/services/deck-utils.ts#L1-L21). Предобработка возвращает вход без изменений; encode/decode — внешняя библиотека. Не доказывает её round-trip гарантии. Качество A для обвязки, Unknown для зависимости; R-46, TC-46.

#### EV-127 — Отрицательная проверка Drag-and-drop
Источник: каталог deckbuilder и package.json; обработчики мыши в [constructed-deckbuilder-cards.component.ts, L520-L549](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L520-L549) вызывают stopPropagation. Не доказывает абсолютное отсутствие механики во всём продукте или запрет выделения текста. Качество C до воспроизводимого перечня проверенных файлов; F-03.

#### EV-128 — Начальное значение потока коллекции
Источник: [base-is.ts, L10](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/collection/details/base-is.ts#L10). Поток коллекции создаётся с начальным значением null. Не доказывает время отображения UI. Качество A; R-47, E-26, TC-43.

#### EV-129 — Передача потока и nullish-нормализация
Источники: [collection-manager.service.ts, L125](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/collection/collection-manager.service.ts#L125); [sets-manager.service.ts, L27-L40](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/collection/sets-manager.service.ts#L27-L40). Подтверждает передачу потока, первую подписку, debounceTime(1000), collection ?? []. Не доказывает runtime-порядок UI. Качество A; R-47, E-26, E-27.

#### EV-130 — Полный каталог с нулевым владением
Источник: [sets-manager.service.ts, L43-L76](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/collection/sets-manager.service.ts#L43-L76). Для всех карт всех наборов строятся записи; отсутствие точного ID даёт ноль по четырём счётчикам. Не доказывает момент отображения каталога. Качество A; R-48, E-27, TC-43.

#### EV-131 — Плоский список
Источник: [constructed-deckbuilder-cards.component.ts, L291-L297](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L291-L297). Наборы разворачиваются в единый плоский список. Не доказывает UI-видимость начальной эмиссии. Качество A; R-49, E-26.

#### EV-132 — Передача плоского списка
Источник: [constructed-deckbuilder-cards.component.ts, L68-L76](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L68-L76). Подтверждает передачу списка во вход collection дочернего компонента. Не доказывает время рендера. Качество A; R-49, E-26.

#### EV-133 — Нормализация входа списка колоды
Источник: [deck-list-static.component.ts, L91-L115](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts#L91-L115). Пустой массив сбрасывает внутреннюю коллекцию в null; непустой каталог преобразуется в словарь. Качество A; R-37, E-26, E-27.

#### EV-134 — Маркер нехватки
Источник: [deck-list-static.component.ts, L183-L213](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/overlay/deck-list-static.component.ts#L183-L213). При внутреннем null карта считается имеющейся; иначе проверяется агрегированное владение. Не доказывает runtime-видимость промежуточного состояния. Качество A; R-36, E-26…E-28.

#### EV-135 — Агрегация альтернативных версий
Источник: [collection-utils.ts, L8-L32](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/services/collection/collection-utils.ts#L8-L32). Маркер суммирует владение по цепочке альтернативных версий и защищён от циклов. Не доказывает применение для пыли. Качество A; R-36, E-28.

#### EV-136 — Пыль по точному ID
Источник: [constructed-deckbuilder-cards.component.ts, L431-L446](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/legacy/feature-shell/src/lib/js/components/decktracker/main/deckbuilder/constructed-deckbuilder-cards.component.ts#L431-L446). Недостающие копии вычисляются по точному ID, умножаются на стоимость по редкости и суммируются. Качество A; R-35, E-26…E-28.

#### EV-137 — Стоимость создания
Источник: [hs-utils.ts, L800-L811](https://github.com/Zero-to-Heroes/firestone/blob/0a30f066eb77a417637d95cec86444456f607ba1/libs/game-state/src/lib/services/hs-utils.ts#L800-L811). Обычная стоимость: common/default 40, rare 100, epic 400, legendary 1600. Если rarity отсутствует, вызывающий расчёт даёт 0 до вызова функции; непустая неизвестная строка использует default 40. Качество A; R-35.

## 4. Качество доказательств

Шкала по шаблону: **A** — первичное и прямое (исходник, тест, схема, наблюдаемое поведение); **B** — первичное, но косвенное (документация, пример данных, комментарий, внешний ресурс); **C** — слабое/неполное; **U** — отсутствует.

| Категория | Кол-во записей | Комментарий |
|---|---|---|
| A — прочитанные исходные файлы и схемы зафиксированного commit (включая EV-118) | 77 | основа всех правил R-01…R-45; строки и permalink указаны |
| A — метаданные репозитория, манифест и лицензионный статус (EV-001, EV-002) | 2 | фиксация snapshot и границ донора |
| A — инвентаризация тестов и отрицательные проверки поиском по каталогу (EV-003, EV-104) | 2 | подтверждают отсутствие тестов, мана-кривой, undo/redo, замены карты, drag-and-drop |
| A — микропроверка семантики языка (EV-107) | 1 | вспомогательное доказательство механизма дефекта E-01; **не** тест донора |
| B — документация, внешние ресурсы донора и история изменений (EV-004, EV-005, EV-006, EV-039, EV-052) | 5 | не привязаны к commit; для двух JSON зафиксированы время получения, размер и хеш |
| C — выборочный просмотр стилей (EV-117) | 1 | не позволяет утверждать что-либо о визуальной композиции |
| U — поведение не подтверждено | перечислены ниже | не использовались для статуса Confirmed |
| **Всего записей журнала** | **88** | 82 × A, 5 × B, 1 × C |

**Области с качеством U (доказательство отсутствует):**

| Область | Почему U | Где отражено |
|---|---|---|
| Автоматизированные тесты функции № 2 | тестов нет (EV-003) | §13 спецификации, все TC — Not executed |
| Наблюдаемое поведение приложения (рантайм) | приложение не собиралось и не запускалось | §15 спецификации |
| Внутренняя логика кодирования/декодирования кода колоды | внешний npm-пакет вне репозитория донора | §15 спецификации, гипотеза H-03 |
| Внутренняя логика справочника карт (порядок карт, поля «двойников», «туристов») | внешний npm-пакет вне репозитория донора | E-21, гипотеза H-04 |
| Создание/редактирование вложенных наборов в конструкторе | не найдено в коде (EV-118) | §13, E-23 |
| Замена карты одним действием, undo/redo, drag-and-drop | не найдено в коде (EV-104) | R-13, §13 |
| Пользовательские фильтры (стоимость/тип/редкость/«только имеющиеся») и выбор сортировки | не найдено в коде конструктора (EV-049, EV-104) | §13, Q-09 |
| Клавиатурная навигация по сетке карт | не найдено в коде (EV-049, EV-102) | §13 (частично функция № 7) |
| Валидация имени колоды, ограничение длины | не найдено (EV-103, EV-089) | E-18 |
| Поведение Electron-/мобильных сборок конструктора | код этих приложений не исследовался | §5 непроверенных зон |

Для всех критических правил (лимиты копий, размер колоды, валидность, удаление, руны, экспорт, сохранение, импорт) использованы доказательства уровня **A**. Правила, опирающиеся на B (наполнение наборов форматов, обещанные подсказки поиска), явно помечены как изменяемые внешние данные и не определяют ядро поведения.

## 5. Непроверенные зоны

| ID | Область / сценарий | Почему не проверено | Что нужно открыть или выполнить | Риск для спецификации |
|---|---|---|---|---|
| NZ-01 | Реальное поведение UI (все сценарии) | приложение не запускалось; требуется платформа Overwolf/игровое окружение и сеть донора | собрать и запустить приложение донора либо наблюдать готовую сборку | средний: возможны расхождения между кодом и наблюдаемым поведением (анимации, гонки обновлений) |
| NZ-02 | Тестовое покрытие функции | тестов конструктора в репозитории нет (EV-003) | написать собственные тесты HDMS по TC-01…TC-42 | высокий для контролёра: ни одно правило не подтверждено тестом донора |
| NZ-03 | Кодирование/декодирование кода колоды | внешняя библиотека вне назначенного репозитория (EV-002) | отдельное решение владельца о допустимости исследования этой библиотеки | средний: точные ограничения формата кода, обработка ошибок декодирования |
| NZ-04 | Справочник карточных данных (поля, порядок, «двойники», «туристы», дополнительные стоимости) | внешний пакет и удалённая база карт | исследование справочника как отдельных продуктовых данных | средний: влияет на дедупликацию, руны, «туристов» |
| NZ-05 | Актуальность списков наборов форматов и строк интерфейса | внешние ресурсы, версионируются отдельно от кода (EV-039, EV-052) | повторное получение на дату реализации | средний: правила формата меняются со временем |
| NZ-06 | Вложенные наборы: создание и редактирование | в конструкторе не найдено (EV-118) | искать в других разделах/режимах (вне scope пилота) или запросить решение владельца | средний: пробел функциональности для модульных карт |
| NZ-07 | Поведение при импорте колоды с перегрузкой рун (>3) | не проверялось рантаймом; код панели только отображает занятые руны | исполнить сценарий в приложении или смоделировать | низкий/средний: возможен некорректный пул |
| NZ-08 | Дубли личных колод в UI списка | логика прочитана, отображение агрегируется соседним сервисом | рантайм-проверка сохранения дважды | средний: формулировка E-04 может быть мягче/жёстче |
| NZ-09 | Electron-сборка и мобильные клиенты | код этих приложений не входил в исследуемый набор | открыть соответствующие приложения донора (в рамках той же функции, отдельным заданием) | средний: возможны иные сценарии/состояния |
| NZ-10 | Производительность на больших пулах, виртуализация | не измерялось | профилирование в рантайме | низкий для поведения, средний для UX |
| NZ-11 | Премиальные ограничения и реклама в конструкторе | пункт меню не помечен как премиальный; углублённая проверка гейтинга не выполнялась | проверить сервис подписки/рекламы | низкий: возможно скрытое ограничение части функций |
| NZ-12 | Состав аналитических событий | проверялось только наличие отправок | открыть сервис аналитики | низкий: не влияет на пользовательское поведение |
| NZ-13 | Полная доступность (screen reader, фокус, контраст) | относится к функции № 7; выборочные наблюдения зафиксированы (EV-102) | отдельное задание по функции № 7 | низкий для этого пакета |
| NZ-14 | Локализация на другие языки | получен только один файл строк; тексты не копируются | получить остальные локали при необходимости | низкий |
| NZ-15 | Внешняя wiki донора (описание функций) | не открывалась: описание функций не является доказательством поведения кода | при необходимости открыть как источник B | низкий |

## 6. Противоречия источников

| ID | Утверждение A | Утверждение B | Источники | Текущий вывод | Что требуется проверить |
|---|---|---|---|---|---|
| C-01 | Подсказка поиска в интерфейсе содержит четыре пункта, один из которых описывает токен, не относящийся к Constructed | В коде конструктора обрабатывается только токен класса и выводятся лишь три пункта подсказки | EV-052 (внешние строки), EV-046, EV-045 (шаблон подсказки, строки 448-457) | Namespace строк интерфейса общий с конструктором другого режима; часть подсказок нерелевантна. Не устранено молча | Контролёру: подтвердить, что четвёртый пункт не отображается, и что иных токенов нет |
| C-02 | Недостаток карт для расчёта пыли считается по точному идентификатору карты | Отметка «не хватает» в списке колоды считается по агрегированному владению всеми версиями карты | EV-075, EV-077 против EV-062, EV-078, EV-115 | Два разных алгоритма владения в одном экране → возможны несогласованные показания (пыль > 0 при отсутствии отметок нехватки и наоборот) | Контролёру: подтвердить расхождение; владельцу: выбрать единый алгоритм (Q-08) |
| C-03 | В компоненте импорта оверлея есть диалог «невалидный код» | В конструкторе импорт при ошибке молча не меняет состояние | EV-096 против EV-095, EV-018 | Разное поведение двух точек импорта; в конструкторе пользователь не информирован | Контролёру: подтвердить отсутствие диалога в конструкторе |
| C-04 | Лимит копий: 1 легендарная / 2 остальные (при добавлении) | Критерий валидности проверяет только «≤2» | EV-035, EV-060 против EV-066 | Импортированная колода с 2 легендарными может считаться валидной и быть экспортированной/сохранённой | Контролёру: подтвердить; владельцу: строгость валидации (Q-02) |
| C-05 | Формат twist присутствует в логике пула, кода и фильтра классов | В UI twist не предлагается, а внешний список его наборов пуст | EV-015, EV-016, EV-030 против EV-039 | Импорт twist-колоды даст пустой пул; поддержка формата фактически неполна | Контролёру: подтвердить; владельцу: перечень форматов (Q-01) |
| C-06 | Сохранение personal-колоды должно быть идемпотентным по коду (ожидание из интерфейса «сохранить») | Реализация дописывает новую запись и одновременно сливает существующие с тем же кодом | EV-090, EV-092, EV-114 | Логическое дублирование в хранилище; видимость в UI не подтверждена | Контролёру: проверить рантайм-проявление (NZ-08) |
| C-07 | Отображаемая стоимость карты берётся из справочника | Для одной модульной карты стоимость = сумма стоимостей вложенных карт | EV-062, EV-119 | Частный случай зашит в код; для HDMS требуется обобщённое правило модульных карт | Контролёру: подтвердить; владельцу: правило для модульных карт |

## 7. Журнал гипотез и неизвестного

| ID | Гипотеза / неизвестный вопрос | Основание | Что подтвердит/опровергнет | Влияние |
|---|---|---|---|---|
| H-01 | Черновик конструктора полностью теряется при перезапуске приложения | состояние инициализируется заново (EV-022, EV-024), ключа хранения черновика нет (EV-091) | рантайм-проверка: набрать колоду, перезапустить приложение | среднее: определяет требование к автосохранению (Q-05, Q-06) |
| H-02 | Дубли личных колод видны пользователю как две строки в списке | логика слияния+добавления (EV-090) при последующей фильтрации списка (EV-092, EV-114) | рантайм: сохранить одну и ту же колоду дважды и открыть список колод | среднее: формулировка E-04 и Q-04 |
| H-03 | Ошибки декодирования кода колоды ограничиваются исключением, которое перехватывается вызывающей стороной | все вызовы декодирования в конструкторе обёрнуты в перехват (EV-094, EV-095, EV-063) | исследование внешней библиотеки кодирования (вне границы донора) | среднее: точные классы ошибок импорта |
| H-04 | Выбор версии карты при дедупликации в спорных случаях зависит от порядка внешнего справочника | последний fallback — «первый элемент группы» (EV-033) | исследование справочника карт и порядка его выдачи | низкое/среднее: детерминизм пула |
| H-05 | Импорт колоды с требованиями рун >3 слотов приведёт к пулу, из которого исключены все руновые карты | формула совместимости при отрицательном числе свободных слотов (EV-036) и отображение занятых рун (EV-037) | исполнить сценарий или смоделировать | среднее: граничный случай E-15/E-16 |
| H-06 | Удаление последней карты при клике по вложенной карте реально воспроизводится в UI | код удаления без проверки индекса (EV-061) + клики по вложенным подстрокам (EV-063) + семантика языка (EV-107) | рантайм: импортировать колоду с вложенным набором и кликнуть вложенную карту | высокое: потеря данных пользователем |
| H-07 | В конструкторе нет никаких премиальных ограничений | пункт меню не помечен как премиальный (EV-010) | проверка сервиса подписки и гейтинга в рантайме | низкое |
| U-01 | Как создаются/редактируются вложенные наборы (модульные карты) в конструкторе | не найдено (EV-118) | решение владельца или отдельное исследование | среднее: пробел функции |
| U-02 | Каково точное поведение при недоступности коллекции (ошибка/таймаут) | код трактует отсутствие данных как «всё есть» (EV-080), явной ошибки нет | рантайм с отключённой сетью/игрой | среднее: ложные данные о владении |
| U-03 | Поддерживаются ли альтернативные герои/скины при создании колоды | код берёт героя по умолчанию для класса (EV-068, EV-069) | рантайм/дополнительный код | низкое |
| U-04 | Есть ли ограничение длины/символов имени колоды | валидация не найдена (EV-103, EV-089) | рантайм-проверка длинного имени | низкое |

## 8. Итоговая карта покрытия исследования

| Область | Исследовано | Есть прямые доказательства (A) | Остались пробелы | Уровень уверенности |
|---|---|---|---|---|
| Точка входа, шаги мастера, навигация, возврат | да | да (EV-010…EV-024) | рантайм, восстановление после перезапуска | высокий (по коду) |
| Форматы, классы, наборы | да | да (EV-015…EV-017, EV-030, EV-112) + B (EV-039) | актуальность внешних списков, twist | высокий по логике, средний по данным |
| Пул карт: фильтры, дедупликация, «туристы» | да | да (EV-030…EV-034) | порядок справочника, полнота «туристов» | высокий |
| Лимиты копий, размер, валидность | да | да (EV-035, EV-060, EV-065, EV-066) | строгость валидации при импорте | высокий |
| Добавление/удаление/замена | да | да (EV-060, EV-061) + EV-107 | рантайм-подтверждение дефекта; замены нет | высокий по коду, средний по проявлению |
| Поиск, фильтры, сортировка | да | да (EV-045…EV-048, EV-106, EV-109) | нет расширенных фильтров; внешние подсказки | высокий |
| Руны и ресурсные ограничения | да | да (EV-036, EV-037) | перегрузка рун при импорте | высокий по формуле |
| Список колоды, счётчики, вложенные наборы | да | да (EV-062…EV-064, EV-118, EV-119) | создание/редактирование вложенных наборов | высокий по отображению, пробел по редактированию |
| Коллекция, нехватка, пыль | да | да (EV-075…EV-080, EV-115) | единый алгоритм владения; ошибка коллекции | высокий по коду, выявлено противоречие |
| Экспорт кода | да | да (EV-085…EV-087) | внешняя библиотека кодирования | высокий по составу действий |
| Сохранение и хранение | да | да (EV-088…EV-092, EV-113, EV-114) | дубли в UI, валидация имени | высокий по коду, средний по проявлению |
| Импорт | да | да (EV-093…EV-096) | UI-ошибка, имя, внешнее декодирование | высокий |
| Состояния загрузки/ошибки/пустоты | да | да (EV-011, EV-040, EV-049, EV-050, EV-110) | нет состояний загрузки/ошибки конструктора | высокий |
| Настройки отображения, доступность (базово) | да | да (EV-100…EV-103, EV-108) | полный аудит — функция № 7 | средний |
| Тесты функции | да (инвентаризация) | да, отрицательный результат (EV-003) | тестов нет вовсе | высокий (в отсутствии) |
| Визуальный стиль, анимации | выборочно | нет (C: EV-117) | вне scope | низкий (намеренно) |
| Другие режимы и сборки | нет | нет | вне scope / NZ-09 | не оценивается |

## 9. Самопроверка перед передачей

- [x] Зафиксирован commit SHA и дата (`0a30f066eb77a417637d95cec86444456f607ba1`, коммит 2026-02-08T20:08:36Z, фиксация 2026-11-17 Asia/Shanghai; SHA перепроверен).
- [x] Указаны конкретные пути и строки, а не только ссылка на главную страницу репозитория (88 записей журнала, 27 карточек доказательств с permalink).
- [x] Существенные утверждения спецификации имеют Evidence ID (правила R-01…R-45, граничные случаи E-01…E-23, тест-кейсы TC-01…TC-42 связаны с EV).
- [x] Открыты релевантные исходники, а не только README (51 файл snapshot, из них 46 TypeScript-модулей/конфигураций; README и документ об ошибке использованы как вспомогательные источники B).
- [x] Проверены отрицательные случаи и альтернативные сценарии (импорт с ошибкой, пустой результат, отсутствие коллекции, лимиты, возврат назад, дубли, вложенные карты; отдельные отрицательные проверки поиском).
- [x] Неподтверждённое помечено Unknown / Hypothesis (§7, NZ-01…NZ-15; ни одно правило Confirmed не опирается на C/U).
- [x] Не использовались другие доноры для заполнения пробелов (только Firestone и два его собственных внешних ресурса).
- [x] В документы не перенесены исходные фрагменты, интерфейсные тексты, графика и уникальные внутренние структуры (в журнале указаны только пути, диапазоны строк и смысл; в спецификации — нейтральные формулировки).
- [x] Ограничения исследования перечислены честно: тесты функции отсутствуют, рантайм не наблюдался, внешние пакеты и данные не привязаны к commit.
- [x] Тесты донора не запускались и это не выдаётся за проверку; единственная исполненная проверка — микропроверка семантики языка (EV-107), явно помеченная как не-тест донора.
- [x] Работа ограничена функцией № 2; функции 1, 3–7 и физика игры не исследовались.
- [x] Ссылки проверены механически: 91 permalink сверен с деревом snapshot (пути и границы строк), 3 ссылки открыты по HTTP (200).

**Итог:** пакет готов к независимой проверке. Статус — не BLOCKED. Ключевое ограничение полноты: у донора нет автоматизированных тестов конструктора колод, поэтому все утверждения о поведении опираются на прочитанный исходный код зафиксированного snapshot, а не на тесты или наблюдаемый рантайм.
