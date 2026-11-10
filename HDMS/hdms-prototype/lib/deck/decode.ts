import { decode as deckstringDecode } from "deckstrings";
import type { Deck, DeckCard } from "@/lib/types";

/**

- Decodes a Hearthstone deck code into a structured Deck object.
- Uses the official HearthSim deckstrings library.
*/
export function decodeDeckCode(code: string): Deck {
const decoded = deckstringDecode(code);

const cards: DeckCard[] = [];
for (const entry of decoded.cards) {
// entry is [dbfId, count]
const [dbfId, count] = entry;
cards.push({
id: String(dbfId),
count,
});
}

return {
code,
class: String(decoded.heroes[0] ?? "UNKNOWN"),
format: decoded.format === 1 ? "standard" : "wild",
cards,
};
}