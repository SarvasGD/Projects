import { NextResponse } from "next/server";
import { loadCardRegistry } from "@/lib/cards/registry";
import type { CardData } from "@/lib/types";

export const maxDuration = 30;

const LIMIT = 100;

export async function GET(request: Request) {
const url = new URL(request.url);
const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();
const classFilter = url.searchParams.get("class");
const typeFilter = url.searchParams.get("type");
const costFilterRaw = url.searchParams.get("cost");

try {
const registry = await loadCardRegistry();
const results: CardData[] = [];

for (const card of registry.values()) {
if (card.type === "HERO" || card.type === "HERO_POWER" || card.type === "ENCHANTMENT") continue;
if (q && !card.name.toLowerCase().includes(q)) continue;
if (classFilter && card.cardClass !== classFilter && card.cardClass !== "NEUTRAL") continue;
if (typeFilter && card.type !== typeFilter) continue;
if (costFilterRaw !== null) {
const c = parseInt(costFilterRaw, 10);
if (!isNaN(c) && card.cost !== c) continue;
}
results.push(card);
if (results.length >= LIMIT) break;
}

results.sort((a, b) => {
if (a.cost !== b.cost) return a.cost - b.cost;
return a.name.localeCompare(b.name, "ru");
});

return NextResponse.json({ cards: results, truncated: results.length === LIMIT });
} catch (err: unknown) {
const message = err instanceof Error ? err.message : "Неизвестная ошибка";
return NextResponse.json({ error: message }, { status: 500 });
}
}