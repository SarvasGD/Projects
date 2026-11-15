import { decode as decodeDeckstring } from "deckstrings";
import { loadCardRegistry } from "@/lib/cards/registry";
import type { Deck } from "@/lib/types";

const HERO_CLASSES: Record<number, string> = {
1: "DRUID", 2: "HUNTER", 3: "MAGE", 4: "PALADIN", 5: "PRIEST",
6: "ROGUE", 7: "SHAMAN", 8: "WARLOCK", 9: "WARRIOR",
10: "DEMON_HUNTER", 11: "DEATH_KNIGHT"
};

/**

- Decode deck code. Both Standard and Wild are supported — the card registry
- loads `collectible.json` which includes cards from all sets, so Wild decks
- are simulated the same way as Standard.
*/
export async function decodeDeckCode(code: string): Promise<Deck> {
const decoded = decodeDeckstring(code);
const registry = await loadCardRegistry();

const cards = decoded.cards.map(([dbfId, count]) => ({
dbfId,
count,
card: registry.get(dbfId)
}));

const signature = [...cards]
.sort((a, b) => a.dbfId - b.dbfId)
.map((c) => `${c.dbfId}x${c.count}`)
.join(",");

return {
code,
heroClass: HERO_CLASSES[decoded.heroes[0]] ?? "UNKNOWN",
format: decoded.format === 1 ? "standard" : "wild",
cards,
signature
};
}