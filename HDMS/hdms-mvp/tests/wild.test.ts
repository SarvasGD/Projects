import { describe, it, expect } from "vitest";
import type { Deck, DeckCard, CardData } from "@/lib/types";
import { simulateMatchup } from "@/lib/sim/matchup";
import { buildRegistry, cheapMinion, cheapMinion2, midMinion, bigMinion } from "./fixtures/testCards";

function mkWildDeck(name: string, entries: Array<[CardData, number]>): Deck {
const cards: DeckCard[] = entries.map(([card, count]) => ({
dbfId: card.dbfId,
count,
card
}));
return {
code: `wild-${name}`,
heroClass: "ROGUE",
format: "wild",
cards,
signature: `wild-${name}-sig`
};
}

describe("Wild format (iteration C)", () => {
const wildAggro = mkWildDeck("aggro", [[cheapMinion, 15], [cheapMinion2, 15]]);
const wildMidrange = mkWildDeck("mid", [[cheapMinion, 5], [midMinion, 15], [bigMinion, 10]]);
const registry = buildRegistry([cheapMinion, cheapMinion2, midMinion, bigMinion]);

it("Wild deck is simulated successfully", () => {
const s = simulateMatchup(wildAggro, wildMidrange, registry, 20, 42);
expect(s.games).toBe(20);
expect(s.winrateA + s.winrateB + s.drawRate).toBeCloseTo(1.0, 3);
});

it("Wild deck summary shows format='wild'", () => {
const s = simulateMatchup(wildAggro, wildMidrange, registry, 10, 42);
expect(s.deckA.format).toBe("wild");
expect(s.deckB.format).toBe("wild");
});

it("Wild vs Wild determinism holds", () => {
const s1 = simulateMatchup(wildAggro, wildMidrange, registry, 15, 777);
const s2 = simulateMatchup(wildAggro, wildMidrange, registry, 15, 777);
expect(s1.winrateA).toBe(s2.winrateA);
expect(s1.avgTurns).toBe(s2.avgTurns);
});
});