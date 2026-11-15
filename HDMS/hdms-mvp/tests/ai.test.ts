import { describe, it, expect } from "vitest";
import { simulateMatchup } from "@/lib/sim/matchup";
import {
fixtureRegistry, aggroDeck, controlDeck, midrangeDeck
} from "./fixtures/testCards";

describe("AI improvement: lethal detection (iteration C)", () => {
it("aggro AI kills control faster than before (avg turns < 15)", () => {
const s = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 50, 42);
expect(s.avgTurns).toBeLessThan(15);
});

it("aggro vs control has decided winrate (not 50/50)", () => {
const s = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 50, 42);
const diff = Math.abs(s.winrateA - s.winrateB);
expect(diff).toBeGreaterThan(0.15);
});

it("aggro clears through control (winrate > 40%)", () => {
const s = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 50, 42);
expect(s.winrateA).toBeGreaterThan(0.4);
});

it("midrange vs control is closer than aggro vs control", () => {
const aggroVsControl = simulateMatchup(aggroDeck, controlDeck, fixtureRegistry, 50, 42);
const midVsControl = simulateMatchup(midrangeDeck, controlDeck, fixtureRegistry, 50, 42);
const aggroDiff = Math.abs(aggroVsControl.winrateA - aggroVsControl.winrateB);
const midDiff = Math.abs(midVsControl.winrateA - midVsControl.winrateB);
expect(midDiff).toBeLessThanOrEqual(aggroDiff + 0.05);
});
});