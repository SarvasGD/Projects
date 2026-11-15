import { NextResponse } from "next/server";
import { encodeDeckCode } from "@/lib/deck/encode";

export async function POST(request: Request) {
try {
const body = await request.json();
const { heroes, format, cards } = body as {
heroes?: number[];
format?: 1 | 2;
cards?: Array<[number, number]>;
};

if (!heroes || !cards || !format) {
return NextResponse.json({ error: "Нужны heroes, format, cards" }, { status: 400 });
}

const code = encodeDeckCode({ heroes, format, cards });
return NextResponse.json({ code });
} catch (err: unknown) {
const message = err instanceof Error ? err.message : "Неизвестная ошибка";
return NextResponse.json({ error: message }, { status: 400 });
}
}