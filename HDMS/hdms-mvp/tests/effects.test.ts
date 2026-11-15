import { describe, expect, it } from "vitest";
import { parseEffect } from "@/lib/sim/effects";
import type { CardData } from "@/lib/types";

function card(text: string): CardData {
  return {
    dbfId: 9001,
    name: "Effect parser fixture",
    cost: 3,
    type: "SPELL",
    cardClass: "MAGE",
    mechanics: [],
    referencedTags: [],
    text
  };
}

describe("Effect parser stat-line patterns", () => {
  it("parses English +attack/+health buffs", () => {
    expect(parseEffect(card("Give a minion +2/+3." )).buff).toEqual({
      attack: 2,
      health: 3
    });
  });

  it("parses both Russian buff phrasings", () => {
    expect(parseEffect(card("Даёт существу +1/+2.")).buff).toEqual({
      attack: 1,
      health: 2
    });
    expect(parseEffect(card("Дайте существу +3/+4.")).buff).toEqual({
      attack: 3,
      health: 4
    });
  });

  it("parses English and Russian summon stat lines", () => {
    expect(parseEffect(card("Summon a 2/3 Elemental.")).summon).toEqual({
      attack: 2,
      health: 3
    });
    expect(parseEffect(card("Призывает существо 4/5.")).summon).toEqual({
      attack: 4,
      health: 5
    });
  });

  it("parses transform stat lines", () => {
    expect(parseEffect(card("Transform a minion into a 0/1 frog with Taunt.")).transformTo)
      .toEqual({ attack: 0, health: 1 });
  });
});
