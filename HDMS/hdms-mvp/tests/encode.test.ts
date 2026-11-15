import { describe, it, expect } from "vitest";
import { decodeRaw } from "@/lib/deck/raw";
import { encodeDeckCode, encodeFromMap } from "@/lib/deck/encode";
const CODE_TEMNAYA =
"AAECAdWQCArDgwfygwe/hwfRnQfmowfIrgeZsQfysgeI2QeI3QcK958EtfoG9YEH94EHkIMHwYcHx64HmrMHurMHnIIIAAA==";

const CODE_DRAGON =
"AAECAaIHCPKDB+ajB5WkB/KyB4jZB5HZB43aB4TpBwv3nwT3gQeQgwf3gwfHrgfrsgfssgeaswe6sweEvQe1wAcAAA==";

describe("Deck encode/decode round-trip (iteration D)", () => {
it("decodeRaw preserves heroes, format, cards", () => {
const raw = decodeRaw(CODE_TEMNAYA);
expect(raw.heroes.length).toBeGreaterThan(0);
expect(raw.format).toBe(1);
const total = raw.cards.reduce((s, [, c]) => s + c, 0);
expect(total).toBe(30);
});

it("decode → encode produces a code that decodes back to same cards", () => {
const raw = decodeRaw(CODE_TEMNAYA);
const encoded = encodeDeckCode(raw);
const raw2 = decodeRaw(encoded);
expect(raw2.heroes).toEqual(raw.heroes);
expect(raw2.format).toEqual(raw.format);
const total2 = raw2.cards.reduce((s, [, c]) => s + c, 0);
expect(total2).toBe(30);
// Compare card sets (order-independent)
const set1 = new Set(raw.cards.map(([id, c]) => `${id}x${c}`));
const set2 = new Set(raw2.cards.map(([id, c]) => `${id}x${c}`));
expect(set2).toEqual(set1);
});

it("same round-trip works for Dragon deck", () => {
const raw = decodeRaw(CODE_DRAGON);
const encoded = encodeDeckCode(raw);
const raw2 = decodeRaw(encoded);
expect(raw2.heroes).toEqual(raw.heroes);
const set1 = new Set(raw.cards.map(([id, c]) => `${id}x${c}`));
const set2 = new Set(raw2.cards.map(([id, c]) => `${id}x${c}`));
expect(set2).toEqual(set1);
});

it("encodeFromMap produces same result as encodeDeckCode", () => {
const raw = decodeRaw(CODE_TEMNAYA);
const map = new Map<number, number>();
for (const [id, count] of raw.cards) map.set(id, count);
const encoded1 = encodeDeckCode(raw);
const encoded2 = encodeFromMap(map, raw.heroes, raw.format);
// Both should decode to same set of cards
const d1 = decodeRaw(encoded1);
const d2 = decodeRaw(encoded2);
const set1 = new Set(d1.cards.map(([id, c]) => `${id}x${c}`));
const set2 = new Set(d2.cards.map(([id, c]) => `${id}x${c}`));
expect(set2).toEqual(set1);
});

it("throws on empty deck", () => {
expect(() =>
encodeDeckCode({ heroes: [930], format: 1, cards: [] })
).toThrow();
});

it("throws on missing heroes", () => {
expect(() =>
encodeDeckCode({ heroes: [], format: 1, cards: [[1, 1]] })
).toThrow();
});

it("edited deck (removed 1 card) encodes and decodes with 29 cards", () => {
const raw = decodeRaw(CODE_TEMNAYA);
// Remove 1 copy of first card
const modified = raw.cards.map(([id, c], i) => i === 0 ? [id, c - 1] as [number, number] : [id, c] as [number, number]);
const filtered = modified.filter(([, c]) => c > 0);
const encoded = encodeDeckCode({ heroes: raw.heroes, format: raw.format, cards: filtered });
const raw2 = decodeRaw(encoded);
const total = raw2.cards.reduce((s, [, c]) => s + c, 0);
expect(total).toBe(29);
});
});