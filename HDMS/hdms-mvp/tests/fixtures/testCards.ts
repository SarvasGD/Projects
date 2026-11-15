import type { CardData, Deck } from "@/lib/types";

export const cheapMinion: CardData = {
  dbfId: 1001,
  name: "Fixture Scout",
  cost: 1,
  type: "MINION",
  cardClass: "ROGUE",
  mechanics: [],
  referencedTags: [],
  text: "",
  attack: 3,
  health: 2
};

export const cheapMinion2: CardData = {
  dbfId: 1002,
  name: "Fixture Cutpurse",
  cost: 2,
  type: "MINION",
  cardClass: "ROGUE",
  mechanics: [],
  referencedTags: [],
  text: "",
  attack: 3,
  health: 3
};

export const midMinion: CardData = {
  dbfId: 1003,
  name: "Fixture Veteran",
  cost: 4,
  type: "MINION",
  cardClass: "ROGUE",
  mechanics: [],
  referencedTags: [],
  text: "",
  attack: 4,
  health: 5
};

export const bigMinion: CardData = {
  dbfId: 1004,
  name: "Fixture Guardian",
  cost: 6,
  type: "MINION",
  cardClass: "ROGUE",
  mechanics: ["TAUNT"],
  referencedTags: [],
  text: "",
  attack: 6,
  health: 7
};

export const hugeMinion: CardData = {
  dbfId: 1005,
  name: "Fixture Colossus",
  cost: 8,
  type: "MINION",
  cardClass: "ROGUE",
  mechanics: [],
  referencedTags: [],
  text: "",
  attack: 8,
  health: 9
};

export const discoverSpell: CardData = {
  dbfId: 1101,
  name: "Fixture Discovery",
  cost: 3,
  type: "SPELL",
  cardClass: "ROGUE",
  mechanics: ["DISCOVER"],
  referencedTags: [],
  text: "Discover a minion."
};

export const damageSpell: CardData = {
  dbfId: 1102,
  name: "Fixture Bolt",
  cost: 2,
  type: "SPELL",
  cardClass: "ROGUE",
  mechanics: [],
  referencedTags: [],
  text: "Deal 3 damage."
};

export function buildRegistry(cards: CardData[]): Map<number, CardData> {
  return new Map(cards.map((card) => [card.dbfId, card]));
}

export const fixtureRegistry = buildRegistry([
  cheapMinion,
  cheapMinion2,
  midMinion,
  bigMinion,
  hugeMinion,
  discoverSpell,
  damageSpell
]);

function makeDeck(name: string, entries: Array<[CardData, number]>): Deck {
  return {
    code: `fixture-${name}`,
    heroClass: "ROGUE",
    format: "standard",
    cards: entries.map(([card, count]) => ({
      dbfId: card.dbfId,
      count,
      card
    })),
    signature: `fixture-${name}-signature`
  };
}

export const aggroDeck = makeDeck("aggro", [
  [cheapMinion, 20],
  [cheapMinion2, 10]
]);

export const midrangeDeck = makeDeck("midrange", [
  [cheapMinion2, 10],
  [midMinion, 10],
  [bigMinion, 10]
]);

export const controlDeck = makeDeck("control", [
  [midMinion, 10],
  [bigMinion, 10],
  [hugeMinion, 10]
]);
