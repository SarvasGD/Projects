import { describe, it, expect, beforeEach } from "vitest";
import { getPool, resolveDiscover, clearPoolCache, hasRandomGeneration } from "@/lib/sim/randomCards";
import type { CardData } from "@/lib/types";
import {
fixtureRegistry, cheapMinion, midMinion, bigMinion, hugeMinion,
discoverSpell, damageSpell
} from "./fixtures/testCards";

describe("Discover pool caching (iteration C)", () => {
beforeEach(() => {
clearPoolCache();
});

it("getPool returns cached object on second call", () => {
const p1 = getPool(discoverSpell, fixtureRegistry);
const p2 = getPool(discoverSpell, fixtureRegistry);
expect(p1).toBe(p2);
});

it("cached pool contains best/average/worst sorted by cost", () => {
const cached = getPool(discoverSpell, fixtureRegistry);
expect(cached).not.toBeNull();
if (!cached) return;
expect(cached.worst.cost).toBeLessThanOrEqual(cached.average.cost);
expect(cached.average.cost).toBeLessThanOrEqual(cached.best.cost);
});

it("clearPoolCache resets cache", () => {
const p1 = getPool(discoverSpell, fixtureRegistry);
clearPoolCache();
const p2 = getPool(discoverSpell, fixtureRegistry);
expect(p1).not.toBe(p2);
});

it("resolveDiscover is deterministic with seed", () => {
const seed = () => 0.1;
const r1 = resolveDiscover(discoverSpell, fixtureRegistry, seed);
clearPoolCache();
const r2 = resolveDiscover(discoverSpell, fixtureRegistry, seed);
expect(r1?.dbfId).toBe(r2?.dbfId);
});

it("resolveDiscover picks best when rng < 1/3", () => {
const cached = getPool(discoverSpell, fixtureRegistry);
if (!cached) return;
const result = resolveDiscover(discoverSpell, fixtureRegistry, () => 0.1);
expect(result?.dbfId).toBe(cached.best.dbfId);
});

it("resolveDiscover picks worst when rng >= 2/3", () => {
const cached = getPool(discoverSpell, fixtureRegistry);
if (!cached) return;
const result = resolveDiscover(discoverSpell, fixtureRegistry, () => 0.9);
expect(result?.dbfId).toBe(cached.worst.dbfId);
});

it("non-discover card returns null pool", () => {
expect(getPool(damageSpell, fixtureRegistry)).toBeNull();
});

it("hasRandomGeneration is true for Discover spell", () => {
expect(hasRandomGeneration(discoverSpell)).toBe(true);
});

it("hasRandomGeneration is false for plain spell", () => {
expect(hasRandomGeneration(damageSpell)).toBe(false);
});
});