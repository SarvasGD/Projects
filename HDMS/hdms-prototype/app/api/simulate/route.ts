import { NextResponse } from "next/server";
import { decodeDeckCode } from "@/lib/deck/decode";
import { simulateMatchup } from "@/lib/sim/matchup";

export async function POST(request: Request) {
const body = await request.json();
const { codeA, codeB, games = 1000, seed = 42 } = body;

if (!codeA || !codeB) {
return NextResponse.json({ error: "Both deck codes are required" }, { status: 400 });
}

try {
const deckA = decodeDeckCode(codeA);
const deckB = decodeDeckCode(codeB);
const summary = simulateMatchup(deckA, deckB, games, seed);
return NextResponse.json(summary);
} catch (err: unknown) {
const message = err instanceof Error ? err.message : "Unknown error";
return NextResponse.json({ error: `Failed to simulate: ${message}` }, { status: 500 });
}
}