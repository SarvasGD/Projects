import { describe, it, expect } from "vitest";
import { matchesSecret, tryTriggerSecret, isSecretCard, addSecret } from "@/lib/sim/secrets";
import type { CardData, Minion, PlayerState } from "@/lib/types";

function mkSecret(
text: string,
dbfId = 1,
name = "Test Secret"
): CardData {
return {
dbfId, name, cost: 2, type: "SPELL", cardClass: "MAGE",
mechanics: ["SECRET"], referencedTags: [], text
};
}

function mkMinion(attack: number, health: number): Minion {
return {
card: { dbfId: 0, name: "M", cost: 1, type: "MINION", cardClass: "NEUTRAL", mechanics: [], referencedTags: [], text: "", attack, health },
attack, health, maxHealth: health, canAttack: true, summonedThisTurn: false,
taunt: false, divineShield: false, windfury: false, attacksUsed: 0, lifesteal: false
};
}

function mkPlayer(id: 'A' | 'B'): PlayerState {
return {
id, heroClass: "MAGE", hp: 30, armor: 0, mana: 5, maxMana: 5,
hand: [], deck: [], board: [], fatigue: 0, heroPowerLevel: 0,
cardsPlayedThisTurn: 0, heroPowerUsed: false, secrets: []
};
}

describe("Secrets (iteration C)", () => {
it("identifies secret cards correctly", () => {
const secret = mkSecret("When your hero is attacked, gain 4 Armor.");
expect(isSecretCard(secret)).toBe(true);
});

it("non-secret spell is not identified as secret", () => {
const spell: CardData = {
dbfId: 99, name: "Fireball", cost: 4, type: "SPELL", cardClass: "MAGE",
mechanics: [], referencedTags: [], text: "Deal 6 damage."
};
expect(isSecretCard(spell)).toBe(false);
});

it("matches HERO_ATTACKED secret", () => {
const secret = mkSecret("When your hero is attacked, gain 4 Armor.");
expect(matchesSecret(secret, { type: 'HERO_ATTACKED', attacker: mkMinion(3, 3) })).toBe(true);
expect(matchesSecret(secret, { type: 'MINION_PLAYED', minion: mkMinion(3, 3) })).toBe(false);
});

it("matches MINION_PLAYED secret", () => {
const secret = mkSecret("When your opponent plays a minion, deal 3 damage to it.");
expect(matchesSecret(secret, { type: 'MINION_PLAYED', minion: mkMinion(3, 3) })).toBe(true);
});

it("triggers hero-attacked secret: +armor", () => {
const owner = mkPlayer('A');
const attacker = mkPlayer('B');
addSecret(owner, mkSecret("When your hero is attacked, gain 4 Armor."));
const result = tryTriggerSecret(owner, attacker, { type: 'HERO_ATTACKED', attacker: mkMinion(3, 3) });
expect(result).not.toBeNull();
expect(owner.armor).toBe(4);
expect(owner.secrets.length).toBe(0);
});

it("triggers minion-played secret: destroys minion", () => {
const owner = mkPlayer('A');
const attacker = mkPlayer('B');
const minion = mkMinion(5, 5);
attacker.board.push(minion);
addSecret(owner, mkSecret("When your opponent plays a minion, destroy it."));
const result = tryTriggerSecret(owner, attacker, { type: 'MINION_PLAYED', minion });
expect(result).not.toBeNull();
expect(attacker.board.length).toBe(0);
});

it("parses summon stats from a secret", () => {
  const owner = mkPlayer('A');
  const opponent = mkPlayer('B');
  const played = mkMinion(1, 2);
  opponent.board.push(played);

  addSecret(owner, mkSecret("When your opponent plays a minion, summon a 2/3 Elemental."));
  const result = tryTriggerSecret(owner, opponent, { type: 'MINION_PLAYED', minion: played });

  expect(result).not.toBeNull();
  expect(owner.board).toHaveLength(1);
  expect(owner.board[0].attack).toBe(2);
  expect(owner.board[0].health).toBe(3);
});

it("secret pops after triggering (no double-trigger)", () => {
const owner = mkPlayer('A');
const attacker = mkPlayer('B');
addSecret(owner, mkSecret("When your hero is attacked, gain 4 Armor."));
tryTriggerSecret(owner, attacker, { type: 'HERO_ATTACKED', attacker: mkMinion(3, 3) });
const second = tryTriggerSecret(owner, attacker, { type: 'HERO_ATTACKED', attacker: mkMinion(3, 3) });
expect(second).toBeNull();
});
});