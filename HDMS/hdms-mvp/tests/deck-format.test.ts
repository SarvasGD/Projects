import { describe, expect, it, vi } from "vitest";
import { encode } from "deckstrings";

vi.mock("@/lib/cards/registry", () => ({
  loadCardRegistry: vi.fn(async () => new Map())
}));

import { decodeDeckCode } from "@/lib/deck/decode";

function makeDeckCode(format: 1 | 2): string {
  return encode({
    format,
    heroes: [274],
    cards: [[100, 1]]
  });
}

describe("Deck format mapping", () => {
  it("maps deckstring format 1 to Wild", async () => {
    const deck = await decodeDeckCode(makeDeckCode(1));
    expect(deck.format).toBe("wild");
  });

  it("maps deckstring format 2 to Standard", async () => {
    const deck = await decodeDeckCode(makeDeckCode(2));
    expect(deck.format).toBe("standard");
  });
});
