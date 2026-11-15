import { describe, it, expect, vi } from "vitest";
import { parseEffect } from "@/lib/sim/effects";
import type { CardData } from "@/lib/types";

function mkCard(text: string, overrides: Partial<CardData> = {}): CardData {
return {
dbfId: 1, name: "Test", cost: 3, type: "SPELL", cardClass: "MAGE",
mechanics: [], referencedTags: [], text, ...overrides
};
}

describe("Transformations (iteration C)", () => {
it("parses Hex-style transform to 0/1", () => {
const card = mkCard("Transform a minion into a 0/1 frog with Taunt.");
const eff = parseEffect(card);
expect(eff.transformTo).toEqual({ attack: 0, health: 1 });
});

it("parses Polymorph-style transform to 1/1", () => {
const card = mkCard("Transform a minion into a 1/1 Sheep.");
const eff = parseEffect(card);
expect(eff.transformTo).toEqual({ attack: 1, health: 1 });
});

it("parses Russian transform: 'Превращает в 0/1'", () => {
const card = mkCard("Превращает существо в 0/1 лягушку.");
const eff = parseEffect(card);
expect(eff.transformTo).toEqual({ attack: 0, health: 1 });
});

it("plain damage spell does NOT set transformTo", () => {
const card = mkCard("Deal 6 damage.");
const eff = parseEffect(card);
expect(eff.transformTo).toBeUndefined();
});
});

describe("Card copying (iteration C)", () => {
it("parses English copy-from-hand", () => {
const card = mkCard("Copy a card from your opponent's hand.");
const eff = parseEffect(card);
expect(eff.copyFromOpponentHand).toBe(true);
});

it("parses Russian copy-from-hand", () => {
const card = mkCard("Скопируйте карту из руки противника.");
const eff = parseEffect(card);
expect(eff.copyFromOpponentHand).toBe(true);
});

it("ordinary spell doesn't set copy flag", () => {
const card = mkCard("Deal 3 damage.");
const eff = parseEffect(card);
expect(eff.copyFromOpponentHand).toBeUndefined();
});
});