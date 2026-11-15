import { NextResponse } from "next/server";
import { loadCardRegistry } from "@/lib/cards/registry";
import { decodeDeckCode } from "@/lib/deck/decode";
import { simulateMatrix } from "@/lib/sim/matchup";
import type { SimOptions } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
const body = await request.json();
const { codes, games = 100, seed, options } = body as {
codes?: string[];
games?: number;
seed?: number;
options?: SimOptions;
};

if (!codes || !Array.isArray(codes) || codes.length < 2) {
return NextResponse.json({ error: "Нужно минимум 2 кода колод" }, { status: 400 });
}

if (codes.length > 8) {
return NextResponse.json({ error: "Максимум 8 колод" }, { status: 400 });
}

try {
const registry = await loadCardRegistry();
const decks = await Promise.all(codes.map((c) => decodeDeckCode(c)));
const summary = simulateMatrix(decks, registry, games, seed, options);
return NextResponse.json(summary);
} catch (err: unknown) {
const message = err instanceof Error ? err.message : "Неизвестная ошибка";
return NextResponse.json({ error: `Симуляция матрицы не удалась: ${message}` }, { status: 500 });
}
}