import { NextResponse } from "next/server";
import { loadCardRegistry } from "@/lib/cards/registry";
import { decodeDeckCode } from "@/lib/deck/decode";
import { summarizeDeck } from "@/lib/sim/matchup";

export const maxDuration = 30;

/**

- Decode a deck code and return summary (heroClass, format, cardCount, avgCost,
- manaCurve, cards list). Does NOT run simulation. Used by the matrix drag-and-drop
- builder to show deck info before/without simulating.
*/
export async function POST(request: Request) {
try {
const body = await request.json();
const { code } = body as { code?: string };
if (!code) {
return NextResponse.json({ error: "Нужен code" }, { status: 400 });
}

// Ensure registry is loaded — decode needs cards data
await loadCardRegistry();
const deck = await decodeDeckCode(code);
const summary = summarizeDeck(deck);
return NextResponse.json({
code: deck.code,
heroClass: deck.heroClass,
format: deck.format,
cardCount: summary.cardCount,
avgCost: summary.avgCost,
manaCurve: summary.manaCurve,
typeBreakdown: summary.typeBreakdown,
cards: summary.cards
});
} catch (err: unknown) {
const message = err instanceof Error ? err.message : "Неизвестная ошибка";
return NextResponse.json({ error: message }, { status: 400 });
}
}