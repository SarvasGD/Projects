import { NextResponse } from "next/server";
import { runMatchupCodes } from "@/lib/sim/runner";
import type { SimOptions } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
const body = await request.json();
const { codeA, codeB, games = 200, seed, options } = body as {
codeA?: string;
codeB?: string;
games?: number;
seed?: number;
options?: SimOptions;
};

if (!codeA || !codeB) {
return NextResponse.json({ error: "Нужны оба кода колод" }, { status: 400 });
}

try {
const summary = await runMatchupCodes(
codeA,
codeB,
games,
seed ?? Date.now(),
options
);
return NextResponse.json(summary);
} catch (err: unknown) {
const message = err instanceof Error ? err.message : "Неизвестная ошибка";
return NextResponse.json({ error: `Симуляция не удалась: ${message}` }, { status: 500 });
}
}