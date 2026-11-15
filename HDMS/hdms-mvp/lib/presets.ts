import type { Preset } from "@/lib/types";

/**

- Preset deck codes. Codes marked as `null` are placeholders — пользователь
- может добавить свои коды прямо в этом файле или через UI (заполнить поле).
- 
- Все коды протестированы на импорт (декодируются через `deckstrings`).
*/
export const PRESETS: Preset[] = [
{
id: "temnaya-zaryadka",
name: "Тёмная зарядка",
archetype: "combo",
class: "Rogue",
code:
"AAECAdWQCArDgwfygwe/hwfRnQfmowfIrgeZsQfysgeI2QeI3QcK958EtfoG9YEH94EHkIMHwYcHx64HmrMHurMHnIIIAAA==",
description:
"Разбойник на зарядке силы героя + Морхи. Комбо-план с добиванием через усиленную силу героя."
},
{
id: "dragon-zaryadka",
name: "ДраконЗарядка",
archetype: "midrange",
class: "Rogue",
code:
"AAECAaIHCPKDB+ajB5WkB/KyB4jZB5HZB43aB4TpBwv3nwT3gQeQgwf3gwfHrgfrsgfssgeaswe6sweEvQe1wAcAAA==",
description:
"Разбойник на драконах + зарядка. Держит стол драконами, разгоняется по Imbue."
},
{
id: "aggro-placeholder",
name: "Aggro (добавьте код)",
archetype: "aggro",
class: "—",
code: null,
description: "Замените `code: null` в `lib/presets.ts` на актуальный код агро-колоды."
},
{
id: "control-placeholder",
name: "Control (добавьте код)",
archetype: "control",
class: "—",
code: null,
description: "Замените `code: null` в `lib/presets.ts` на актуальный код контроль-колоды."
},
{
id: "tempo-placeholder",
name: "Tempo (добавьте код)",
archetype: "tempo",
class: "—",
code: null,
description: "Замените `code: null` в `lib/presets.ts` на актуальный код темпо-колоды."
}
];