import { decode } from "deckstrings";

/**

- Raw deck (without registry enrichment). Used by the deck builder UI,
- which fetches card data on demand from /api/cards/batch.
*/
export interface RawDeck {
heroes: number[];
format: 1 | 2;
cards: Array<[number, number]>;
}

export function decodeRaw(code: string): RawDeck {
const d = decode(code);
return {
heroes: d.heroes,
format: (d.format === 2 ? 2 : 1) as 1 | 2,
cards: d.cards as Array<[number, number]>
};
}