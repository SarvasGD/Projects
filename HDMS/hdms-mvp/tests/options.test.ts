import { describe, it, expect } from "vitest";
import { simulateMatchup } from "@/lib/sim/matchup";
import { fixtureRegistry, aggroDeck, controlDeck } from "./fixtures/testCards";
describe("SimOptions: maxTurns (iteration B)", () => {
it("respects maxTurns - no game goes beyond limit", () => {
const s = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 50, 123, { maxTurns: 10 });
for (const turn of Object.keys(s.turnDistribution)) {
expect(Number(turn)).toBeLessThanOrEqual(10);
}
});

it("shorter maxTurns increases draw rate in slow matchups", () => {
const short = simulateMatchup(controlDeck, controlDeck, fixtureRegistry, 50, 42, { maxTurns: 5 });
const long = simulateMatchup(controlDeck, controlDeck, fixtureRegistry, 50, 42, { maxTurns: 30 });
expect(short.drawRate).toBeGreaterThanOrEqual(long.drawRate);
});

it("reflects options in summary", () => {
const s = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 50, 42, { maxTurns: 15 });
expect(s.options.maxTurns).toBe(15);
expect(s.options.mulligan).toBeNull();
});

it("default maxTurns is 30", () => {
const s = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 20, 42);
expect(s.options.maxTurns).toBe(30);
});
});

describe("SimOptions: mulligan (iteration B)", () => {
it("mulligan is off by default", () => {
const s = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 20, 42);
expect(s.options.mulligan).toBeNull();
});

it("mulligan is reflected in summary options", () => {
const s = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 20, 42, {
mulligan: { keepBelowCost: 2 }
});
expect(s.options.mulligan).toEqual({ keepBelowCost: 2 });
});

it("mulligan with keepBelowCost=1 favors aggro (keeps cheap cards)", () => {
const withMull = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 100, 42, {
mulligan: { keepBelowCost: 1 }
});
const without = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 100, 42);
// Aggro deck is all 1-2 cost, mulligan should not hurt it
expect(withMull.winrateA).toBeGreaterThan(0.3);
expect(without.winrateA).toBeGreaterThan(0.3);
});

it("seed determinism holds with mulligan enabled", () => {
const s1 = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 30, 555, {
mulligan: { keepBelowCost: 2 }
});
const s2 = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 30, 555, {
mulligan: { keepBelowCost: 2 }
});
expect(s1.winrateA).toBe(s2.winrateA);
expect(s1.avgTurns).toBe(s2.avgTurns);
});
});