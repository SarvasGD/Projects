import { describe, it, expect } from "vitest";
import { simulateMatrix } from "@/lib/sim/matchup";
import { fixtureRegistry, aggroDeck, controlDeck, midrangeDeck } from "./fixtures/testCards";

describe("Matrix simulation (iteration B)", () => {
it("returns NxN matrix with diagonal set to 0.5", () => {
const m = simulateMatrix([aggroDeck, controlDeck, midrangeDeck], fixtureRegistry, 30, 42);
expect(m.decks.length).toBe(3);
expect(m.matrix.length).toBe(3);
expect(m.matrix[0][0]).toBe(0.5);
expect(m.matrix[1][1]).toBe(0.5);
expect(m.matrix[2][2]).toBe(0.5);
});

it("matrix and transpose agree: w_ij + w_ji + draw_ij = 1", () => {
const m = simulateMatrix([aggroDeck, controlDeck], fixtureRegistry, 30, 42);
const w01 = m.matrix[0][1];
const w10 = m.matrix[1][0];
const d01 = m.draws[0][1];
expect(w01 + w10 + d01).toBeCloseTo(1.0, 3);
});

it("aggro vs control: aggro has advantage in matrix cell", () => {
const m = simulateMatrix([aggroDeck, controlDeck], fixtureRegistry, 50, 42);
// matrix[0][1] = aggro winrate vs control -> > 0.5
expect(m.matrix[0][1]).toBeGreaterThan(0.5);
});

it("deterministic across runs with same seed", () => {
const m1 = simulateMatrix([aggroDeck, controlDeck, midrangeDeck], fixtureRegistry, 20, 777);
const m2 = simulateMatrix([aggroDeck, controlDeck, midrangeDeck], fixtureRegistry, 20, 777);
expect(m1.matrix).toEqual(m2.matrix);
});

it("single-deck matrix is trivial 1x1", () => {
const m = simulateMatrix([aggroDeck], fixtureRegistry, 10, 42);
expect(m.decks.length).toBe(1);
expect(m.matrix[0][0]).toBe(0.5);
});
});