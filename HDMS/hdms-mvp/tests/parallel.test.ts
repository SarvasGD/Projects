import { describe, it, expect } from "vitest";
import { mergeSummaries } from "@/lib/sim/parallel";
import type { MatchupSummary, WinPath, SimOptions } from "@/lib/types";
import { simulateMatchup } from "@/lib/sim/matchup";
import { fixtureRegistry, aggroDeck, controlDeck, midrangeDeck } from "./fixtures/testCards";
function mkSummary(overrides: Partial<MatchupSummary> = {}): MatchupSummary {
const emptyPath: Record<WinPath, number> = { aggro: 0, midrange: 0, control: 0, combo: 0, mixed: 0 };
const defaultOptions: Required<SimOptions> = { maxTurns: 30, mulligan: null };
const defaultDeck = {
heroClass: "ROGUE",
format: "standard",
cardCount: 30,
avgCost: 3,
manaCurve: {},
typeBreakdown: {},
cards: []
};
return {
games: 100,
winrateA: 0.5,
winrateB: 0.4,
drawRate: 0.1,
avgTurns: 10,
avgHpOnWinA: 15,
avgHpOnWinB: 12,
turnDistribution: { 10: 100 },
winPathDistributionA: { ...emptyPath, midrange: 1 },
winPathDistributionB: { ...emptyPath, aggro: 1 },
winlineFastest: null,
winlineLongest: null,
winlineHighestHp: null,
deckA: defaultDeck,
deckB: defaultDeck,
options: defaultOptions,
...overrides
};
}

describe("mergeSummaries (infra)", () => {
it("single summary returns as-is", () => {
const s = mkSummary();
expect(mergeSummaries([s])).toBe(s);
});

it("throws on empty array", () => {
expect(() => mergeSummaries([])).toThrow();
});

it("combines two equal summaries preserving winrates", () => {
const a = mkSummary({ games: 100, winrateA: 0.5, winrateB: 0.4, drawRate: 0.1 });
const b = mkSummary({ games: 100, winrateA: 0.5, winrateB: 0.4, drawRate: 0.1 });
const merged = mergeSummaries([a, b]);
expect(merged.games).toBe(200);
expect(merged.winrateA).toBeCloseTo(0.5, 5);
expect(merged.winrateB).toBeCloseTo(0.4, 5);
expect(merged.drawRate).toBeCloseTo(0.1, 5);
});

it("weighted average when one batch is bigger", () => {
const a = mkSummary({ games: 100, winrateA: 0.6, winrateB: 0.3, drawRate: 0.1 });
const b = mkSummary({ games: 300, winrateA: 0.4, winrateB: 0.5, drawRate: 0.1 });
const merged = mergeSummaries([a, b]);
expect(merged.games).toBe(400);
expect(merged.winrateA).toBeCloseTo((0.6 * 100 + 0.4 * 300) / 400, 5);
expect(merged.winrateB).toBeCloseTo((0.3 * 100 + 0.5 * 300) / 400, 5);
});

it("sums turn distributions", () => {
const a = mkSummary({ turnDistribution: { 8: 50, 9: 50 } });
const b = mkSummary({ turnDistribution: { 8: 30, 10: 70 } });
const merged = mergeSummaries([a, b]);
expect(merged.turnDistribution[8]).toBe(80);
expect(merged.turnDistribution[9]).toBe(50);
expect(merged.turnDistribution[10]).toBe(70);
});

it("winrates + draws sum to 1 after merge", () => {
const a = mkSummary({ winrateA: 0.55, winrateB: 0.35, drawRate: 0.1 });
const b = mkSummary({ winrateA: 0.45, winrateB: 0.45, drawRate: 0.1 });
const merged = mergeSummaries([a, b]);
expect(merged.winrateA + merged.winrateB + merged.drawRate).toBeCloseTo(1.0, 5);
});

it("merges winlineFastest (picks minimum turns)", () => {
const fast = { gameIndex: 0, winner: "A" as const, turns: 5, hpRemainingA: 20, hpRemainingB: 0, winPathA: "aggro" as const, winPathB: "control" as const, finalBlowSource: "minion" as const, log: [] };
const slow = { ...fast, turns: 10 };
const a = mkSummary({ winlineFastest: fast });
const b = mkSummary({ winlineFastest: slow });
const merged = mergeSummaries([a, b]);
expect(merged.winlineFastest?.turns).toBe(5);
});

it("combines real simulations preserving approximate winrate", () => {
const s1 = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 50, 111);
const s2 = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 50, 222);
const merged = mergeSummaries([s1, s2]);
expect(merged.games).toBe(100);
// Should be roughly close to individual results
const avgOfA = (s1.winrateA + s2.winrateA) / 2;
expect(Math.abs(merged.winrateA - avgOfA)).toBeLessThan(0.1);
});
});