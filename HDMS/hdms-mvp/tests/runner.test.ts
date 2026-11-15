import { describe, it, expect, vi } from "vitest";
// Mock registry and decode so the test doesn't need network.
vi.mock("@/lib/cards/registry", () => ({
loadCardRegistry: vi.fn(async () => new Map()),
getCard: vi.fn(() => undefined)
}));

vi.mock("@/lib/deck/decode", () => ({
decodeDeckCode: vi.fn(async (code: string) => ({
code,
heroClass: "ROGUE",
format: "standard",
cards: [],
signature: `sig-${code}`
}))
}));

import { runMatchupCodes } from "@/lib/sim/runner";

describe("Runner — shared by API route and Worker (infra)", () => {
it("returns a summary with expected shape", async () => {
const codeA = "fake-code-a";
const codeB = "fake-code-b";
const summary = await runMatchupCodes(codeA, codeB, 10, 42, { maxTurns: 20 });

expect(summary).toBeDefined();
expect(summary.games).toBe(10);
expect(typeof summary.winrateA).toBe("number");
expect(typeof summary.winrateB).toBe("number");
expect(typeof summary.drawRate).toBe("number");
expect(summary.options.maxTurns).toBe(20);
});

it("winrates sum to 1 (with draws)", async () => {
const summary = await runMatchupCodes("a", "b", 20, 42);
const total = summary.winrateA + summary.winrateB + summary.drawRate;
expect(total).toBeCloseTo(1.0, 5);
});

it("same seed = same result (determinism)", async () => {
const s1 = await runMatchupCodes("a", "b", 15, 12345);
const s2 = await runMatchupCodes("a", "b", 15, 12345);
expect(s1.winrateA).toBe(s2.winrateA);
expect(s1.avgTurns).toBe(s2.avgTurns);
});

it("respects options.mulligan", async () => {
const summary = await runMatchupCodes("a", "b", 10, 42, {
mulligan: { keepBelowCost: 2 }
});
expect(summary.options.mulligan).toEqual({ keepBelowCost: 2 });
});
});