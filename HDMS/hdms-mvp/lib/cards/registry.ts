import type { CardData } from "@/lib/types";

const CARD_URL = "https://api.hearthstonejson.com/v1/latest/ruRU/cards.collectible.json";

interface RawCard {
dbfId: number;
name: string;
cost?: number;
type?: string;
cardClass?: string;
rarity?: string;
set?: string;
mechanics?: string[];
referencedTags?: string[];
text?: string;
attack?: number;
health?: number;
race?: string;
image?: string;
}

let cache: Map<number, CardData> | null = null;
let loading: Promise<Map<number, CardData>> | null = null;

export async function loadCardRegistry(): Promise<Map<number, CardData>> {
if (cache) return cache;
if (loading) return loading;

loading = (async () => {
const res = await fetch(CARD_URL, { cache: "force-cache" });
if (!res.ok) throw new Error(`Failed to load cards: ${res.status}`);
const raw = (await res.json()) as RawCard[];
const map = new Map<number, CardData>();
for (const c of raw) {
map.set(c.dbfId, {
dbfId: c.dbfId,
name: c.name,
cost: c.cost ?? 0,
type: c.type ?? "UNKNOWN",
cardClass: c.cardClass ?? "NEUTRAL",
rarity: c.rarity,
set: c.set,
mechanics: c.mechanics ?? [],
referencedTags: c.referencedTags ?? [],
text: c.text ?? "",
attack: c.attack,
health: c.health,
race: c.race,
image: c.image
});
}
cache = map;
return map;
})();

return loading;
}

export function getCard(dbfId: number): CardData | undefined {
return cache?.get(dbfId);
}