import { NextResponse } from "next/server";
import { loadCardRegistry } from "@/lib/cards/registry";

export const maxDuration = 30;

export async function POST(request: Request) {
const body = await request.json();
const { dbfIds } = body as { dbfIds?: number[] };

if (!Array.isArray(dbfIds)) {
return NextResponse.json({ error: "dbfIds должен быть массивом" }, { status: 400 });
}

try {
const registry = await loadCardRegistry();
const cards = dbfIds
.map((id) => registry.get(id))
.filter((c): c is NonNullable<typeof c> => Boolean(c));
return NextResponse.json({ cards });
} catch (err: unknown) {
const message = err instanceof Error ? err.message : "Неизвестная ошибка";
return NextResponse.json({ error: message }, { status: 500 });
}
}