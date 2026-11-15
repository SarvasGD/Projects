import { encode } from "deckstrings";
import type { RawDeck } from "./raw";

/**

- Encode an editable deck back to a Hearthstone deck code.
- Throws if deck is empty or format/heroes are invalid.
*/
export function encodeDeckCode(deck: RawDeck): string {
if (!deck.heroes || deck.heroes.length === 0) {
throw new Error("Не выбран герой");
}
if (!deck.cards || deck.cards.length === 0) {
throw new Error("Колода пуста");
}
return encode({
cards: deck.cards,
heroes: deck.heroes,
format: deck.format
});
}

/**

- Convenience: convert Map<dbfId, count> + heroes + format to encoded code.
*/
export function encodeFromMap(
cardsMap: Map<number, number>,
heroes: number[],
format: 1 | 2
): string {
const cards: Array<[number, number]> = [];
for (const [dbfId, count] of cardsMap) {
if (count > 0) cards.push([dbfId, count]);
}
return encodeDeckCode({ heroes, format, cards });
}