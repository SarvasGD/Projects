"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import type { CardData, MatchupSummary } from "@/lib/types";
import { decodeRaw, type RawDeck } from "@/lib/deck/raw";

const MAX_DECK_SIZE = 30;

interface PreviousRun {
winrateA: number;
winrateB: number;
avgTurns: number;
games: number;
opponentCode: string;
deckSizeAtRun: number;
}

export default function BuilderPage() {
// Deck state
const [heroes, setHeroes] = useState<number[]>([]);
const [format, setFormat] = useState<1 | 2>(1);
const [cardsMap, setCardsMap] = useState<Map<number, number>>(new Map());
const [cardsData, setCardsData] = useState<Map<number, CardData>>(new Map());
const [importCode, setImportCode] = useState("");
const [importError, setImportError] = useState("");

// Opponent + test state
const [opponentCode, setOpponentCode] = useState("");
const [games, setGames] = useState(100);
const [maxTurns, setMaxTurns] = useState(30);
const [mulliganEnabled, setMulliganEnabled] = useState(false);
const [mulliganCost, setMulliganCost] = useState(2);

// Results
const [result, setResult] = useState<MatchupSummary | null>(null);
const [previousRun, setPreviousRun] = useState<PreviousRun | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

// Search state
const [searchQuery, setSearchQuery] = useState("");
const [searchCost, setSearchCost] = useState<string>("");
const [searchResults, setSearchResults] = useState<CardData[]>([]);
const [searchLoading, setSearchLoading] = useState(false);

const deckSize = useMemo(() => {
let total = 0;
for (const c of cardsMap.values()) total += c;
return total;
}, [cardsMap]);

const heroClass = useMemo(() => {
if (heroes.length === 0) return null;
const anyCard = Array.from(cardsData.values())[0];
return anyCard?.cardClass ?? null;
}, [heroes, cardsData]);

// Load card data when deck changes
const fetchCardData = useCallback(async (ids: number[]) => {
const missing = ids.filter((id) => !cardsData.has(id));
if (missing.length === 0) return;
try {
const res = await fetch("/api/cards/batch", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ dbfIds: missing })
});
const data = await res.json();
if (!res.ok) return;
setCardsData((prev) => {
const next = new Map(prev);
for (const c of data.cards as CardData[]) next.set(c.dbfId, c);
return next;
});
} catch {
// ignore
}
}, [cardsData]);

useEffect(() => {
const ids = Array.from(cardsMap.keys());
if (ids.length > 0) void fetchCardData(ids);
}, [cardsMap, fetchCardData]);

// Search
useEffect(() => {
const timer = setTimeout(async () => {
if (!searchQuery.trim() && searchCost === "") {
setSearchResults([]);
return;
}
setSearchLoading(true);
try {
const params = new URLSearchParams();
if (searchQuery.trim()) params.set("q", searchQuery.trim());
if (searchCost !== "") params.set("cost", searchCost);
if (heroClass) params.set("class", heroClass);
const res = await fetch(`/api/cards/search?${params.toString()}`);
const data = await res.json();
if (res.ok) setSearchResults(data.cards ?? []);
} finally {
setSearchLoading(false);
}
}, 300);
return () => clearTimeout(timer);
}, [searchQuery, searchCost, heroClass]);

// Import deck
function importDeck() {
setImportError("");
try {
const raw: RawDeck = decodeRaw(importCode.trim());
setHeroes(raw.heroes);
setFormat(raw.format);
const map = new Map<number, number>();
for (const [dbfId, count] of raw.cards) map.set(dbfId, count);
setCardsMap(map);
setResult(null);
setPreviousRun(null);
} catch {
setImportError("Не удалось декодировать код колоды");
}
}

function addCard(card: CardData) {
const current = cardsMap.get(card.dbfId) ?? 0;
const isLegendary = card.rarity === "LEGENDARY";
const maxCopies = isLegendary ? 1 : 2;
if (current >= maxCopies) return;
if (deckSize >= MAX_DECK_SIZE) return;
const next = new Map(cardsMap);
next.set(card.dbfId, current + 1);
setCardsMap(next);
}

function removeCard(dbfId: number) {
const current = cardsMap.get(dbfId) ?? 0;
if (current <= 0) return;
const next = new Map(cardsMap);
if (current <= 1) next.delete(dbfId);
else next.set(dbfId, current - 1);
setCardsMap(next);
setResult(null);
}

// Run test with delta
async function runTest() {
setLoading(true);
setError("");
// Preserve current result as "previous" before recomputing
if (result) {
setPreviousRun({
winrateA: result.winrateA,
winrateB: result.winrateB,
avgTurns: result.avgTurns,
games: result.games,
opponentCode,
deckSizeAtRun: result.deckA.cardCount
});
}
try {
const cardsArray: Array<[number, number]> = [];
for (const [id, count] of cardsMap) cardsArray.push([id, count]);

const encodeRes = await fetch("/api/deck/encode", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ heroes, format, cards: cardsArray })
});
const encodeData = await encodeRes.json();
if (!encodeRes.ok) throw new Error(encodeData.error ?? "Не удалось закодировать колоду");

const simRes = await fetch("/api/simulate", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
codeA: encodeData.code,
codeB: opponentCode.trim(),
games,
options: {
maxTurns,
mulligan: mulliganEnabled ? { keepBelowCost: mulliganCost } : null
}
})
});
const simData = await simRes.json();
if (!simRes.ok) throw new Error(simData.error ?? "Ошибка симуляции");
setResult(simData);
} catch (err: unknown) {
setError(err instanceof Error ? err.message : "Неизвестная ошибка");
} finally {
setLoading(false);
}
}

const opponentReady = opponentCode.trim().length > 0;
const deckReady = deckSize === MAX_DECK_SIZE && heroClass !== null;
const canTest = !loading && deckReady && opponentReady;

const delta = previousRun && result
? {
winrateA: result.winrateA - previousRun.winrateA,
avgTurns: result.avgTurns - previousRun.avgTurns
}
: null;

// Legendary violations
const violations: string[] = [];
if (deckSize > MAX_DECK_SIZE) violations.push(`Перебор: ${deckSize}/30 карт`);
if (deckSize < MAX_DECK_SIZE && deckSize > 0) violations.push(`Не хватает: ${deckSize}/30 карт`);
for (const [dbfId, count] of cardsMap) {
const c = cardsData.get(dbfId);
if (c?.rarity === "LEGENDARY" && count > 1) {
violations.push(`Легендарка «${c.name}» × ${count} (макс. 1)`);
}
}

return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="text-center py-2">
        <h1 className="text-3xl font-bold text-hs-gold">Конструктор колод</h1>
        <p className="text-hs-muted text-sm mt-1">
          Импорт → правка → быстрый тест → дельта winrate
        </p>
        <div className="mt-2">
          <Link href="/" className="text-hs-blue hover:text-hs-gold underline text-xs">
            ← Обычный матчап
          </Link>
        </div>
      </header>
{/* Import */}
      <section className="bg-hs-panel border border-hs-border rounded-lg p-4">
        <h3 className="text-sm font-bold text-hs-gold mb-2">Импорт колоды</h3>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-hs-bg border border-hs-border rounded px-3 py-2 font-mono text-xs text-hs-text"
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            placeholder="Вставь deck-код колоды, которую хочешь редактировать"
          />
          <button
            className="bg-hs-gold text-hs-bg font-bold px-4 py-2 rounded hover:opacity-90 text-sm"
            onClick={importDeck}
            disabled={!importCode.trim()}
          >
            Импорт
          </button>
        </div>
        {importError && <div className="text-hs-red text-xs mt-2">{importError}</div>}
        {heroClass && (
          <div className="text-xs text-hs-muted mt-2">
            Класс: <span className="text-hs-gold">{heroClass}</span> ·{" "}
            {format === 1 ? "Стандарт" : "Вольный"} ·{" "}
            <span className={deckSize === MAX_DECK_SIZE ? "text-hs-green" : "text-hs-red"}>
              {deckSize}/30 карт
            </span>
          </div>
        )}
      </section>
{heroClass && (
<>
          <section className="grid lg:grid-cols-2 gap-4">
            {/* Current deck */}
            <div className="bg-hs-panel border border-hs-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-hs-gold">
                  Текущая колода ({deckSize}/30)
                </h3>
              </div>
              {violations.length > 0 && (
                <div className="bg-hs-red/10 border border-hs-red/30 rounded p-2 mb-2 text-xs text-hs-red space-y-1">
                  {violations.map((v, i) => <div key={i}>{v}</div>)}
                </div>
              )}
              <div className="max-h-[500px] overflow-y-auto space-y-1">
                {Array.from(cardsMap.entries())
                  .map(([id, count]) => ({ card: cardsData.get(id), count, id }))
                  .sort((a, b) => (a.card?.cost ?? 0) - (b.card?.cost ?? 0))
                  .map(({ card, count, id }) => (
                    <div
                      key={id}
                      className="flex items-center justify-between text-xs bg-hs-bg/50 rounded px-2 py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-hs-gold font-bold min-w-[20px]">
                          {card?.cost ?? "?"}
                        </span>
                        <span className="text-hs-text truncate">
                          {card?.name ?? `dbfId ${id}`}
                        </span>
                        {card?.rarity === "LEGENDARY" && (
                          <span className="text-[9px] text-yellow-400">◆</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-hs-muted">×{count}</span>
                        <button
                          className="text-hs-red hover:text-hs-gold text-base leading-none w-5"
                          onClick={() => removeCard(id)}
                          title="Убрать 1 копию"
                        >
                          −
                        </button>
                      </div>
                    </div>
                  ))}
                {cardsMap.size === 0 && (
                  <div className="text-xs text-hs-muted text-center py-4">
                    Колода пуста
                  </div>
                )}
              </div>
            </div>
{/* Search */}
            <div className="bg-hs-panel border border-hs-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-hs-gold mb-2">Добавить карты</h3>
              <div className="flex gap-2 mb-2">
                <input
                  className="flex-1 bg-hs-bg border border-hs-border rounded px-2 py-1 text-xs text-hs-text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени"
                />
                <input
                  className="bg-hs-bg border border-hs-border rounded px-2 py-1 w-16 text-xs text-hs-text"
                  value={searchCost}
                  onChange={(e) => setSearchCost(e.target.value)}
                  placeholder="Мана"
                  type="number"
                  min={0}
                  max={10}
                />
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-1">
                {searchLoading && (
                  <div className="text-xs text-hs-muted text-center py-4">Поиск…</div>
                )}
                {!searchLoading && searchResults.length === 0 && (searchQuery || searchCost) && (
                  <div className="text-xs text-hs-muted text-center py-4">Ничего не найдено</div>
                )}
                {!searchLoading && !searchQuery && !searchCost && (
                  <div className="text-xs text-hs-muted text-center py-4">
                    Введи имя или ману, чтобы найти карты
                  </div>
                )}
                {searchResults.map((card) => {
                  const current = cardsMap.get(card.dbfId) ?? 0;
                  const isLegendary = card.rarity === "LEGENDARY";
                  const maxCopies = isLegendary ? 1 : 2;
                  const canAdd = current < maxCopies && deckSize < MAX_DECK_SIZE;
                  return (
                    <div
                      key={card.dbfId}
                      className="flex items-center justify-between text-xs bg-hs-bg/50 rounded px-2 py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-hs-gold font-bold min-w-[20px]">
                          {card.cost}
                        </span>
                        <span className="text-hs-text truncate">{card.name}</span>
                        <span className="text-[10px] text-hs-muted">
                          {card.cardClass === "NEUTRAL" ? "нейтр." : card.cardClass.slice(0, 4)}
                        </span>
                        {card.rarity === "LEGENDARY" && (
                          <span className="text-[9px] text-yellow-400">◆</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {current > 0 && <span className="text-hs-muted">×{current}</span>}
                        <button
                          className="text-hs-green hover:text-hs-gold text-base leading-none w-5 disabled:opacity-30"
                          onClick={() => addCard(card)}
                          disabled={!canAdd}
                          title="Добавить 1 копию"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
{/* Test panel */}
          <section className="bg-hs-panel border border-hs-border rounded-lg p-4">
            <h3 className="text-sm font-bold text-hs-gold mb-3">Быстрый тест</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-hs-muted mb-1">Колода противника (deck-код)</label>
                <input
                  className="w-full bg-hs-bg border border-hs-border rounded px-3 py-2 font-mono text-xs text-hs-text"
                  value={opponentCode}
                  onChange={(e) => setOpponentCode(e.target.value)}
                  placeholder="Вставь код противника"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-hs-muted mb-1">Партий</label>
                  <input
                    type="number"
                    className="w-full bg-hs-bg border border-hs-border rounded px-2 py-1 text-sm text-hs-text"
                    value={games}
                    min={20}
                    max={1000}
                    step={20}
                    onChange={(e) => setGames(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-hs-muted mb-1">Max ходов</label>
                  <input
                    type="number"
                    className="w-full bg-hs-bg border border-hs-border rounded px-2 py-1 text-sm text-hs-text"
                    value={maxTurns}
                    min={10}
                    max={50}
                    onChange={(e) => setMaxTurns(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-hs-muted mb-1">Муллиган</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={mulliganEnabled}
                      onChange={(e) => setMulliganEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">≤</span>
                    <input
                      type="number"
                      className="w-12 bg-hs-bg border border-hs-border rounded px-1 py-1 text-xs text-hs-text"
                      value={mulliganCost}
                      min={0}
                      max={5}
                      disabled={!mulliganEnabled}
                      onChange={(e) => setMulliganCost(Number(e.target.value))}
                    />
                    <span className="text-xs">маны</span>
                  </div>
                </div>
              </div>
              <button
                className="w-full bg-hs-gold text-hs-bg font-bold px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 transition"
                onClick={runTest}
                disabled={!canTest}
              >
                {loading ? "Считаю…" : "Прогнать тест"}
              </button>
              {!deckReady && deckSize > 0 && (
                <div className="text-xs text-hs-red text-center">
                  Колода должна быть 30 карт, чтобы запустить тест
                </div>
              )}
            </div>
{error && (
              <div className="bg-hs-red/10 border border-hs-red/40 text-hs-red p-3 rounded mt-3 text-xs">
                {error}
              </div>
            )}
{result && (
              <div className="mt-4 bg-hs-bg border border-hs-border rounded-lg p-4">
                <h4 className="text-sm font-bold text-hs-gold mb-3">Результат</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <BigStat label="Winrate (моя)" value={`${(result.winrateA * 100).toFixed(1)}%`} color="text-hs-green" />
                  <BigStat label="Winrate (опп)" value={`${(result.winrateB * 100).toFixed(1)}%`} color="text-hs-red" />
                  <BigStat label="Ср. ходов" value={result.avgTurns.toFixed(1)} color="text-hs-blue" />
                  <BigStat label="Ничьи" value={`${(result.drawRate * 100).toFixed(1)}%`} color="text-hs-muted" />
                </div>
                {previousRun && delta && (
                  <div className="mt-3 bg-hs-panel border border-hs-border rounded p-3">
                    <div className="text-xs text-hs-muted mb-2">
                      Δ от предыдущего прогона:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-hs-muted">Winrate:</span>
                        <span className={`font-bold ${delta.winrateA >= 0 ? "text-hs-green" : "text-hs-red"}`}>
                          {delta.winrateA >= 0 ? "↑" : "↓"} {(delta.winrateA * 100).toFixed(1)}%
                        </span>
                        <span className="text-hs-muted text-[10px]">
                          (было {(previousRun.winrateA * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-hs-muted">Ср. ходов:</span>
                        <span className={`font-bold ${delta.avgTurns <= 0 ? "text-hs-green" : "text-hs-red"}`}>
                          {delta.avgTurns >= 0 ? "+" : ""}{delta.avgTurns.toFixed(1)}
                        </span>
                        <span className="text-hs-muted text-[10px]">
                          (было {previousRun.avgTurns.toFixed(1)})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
function BigStat({ label, value, color }: { label: string; value: string; color: string }) {
return (
    <div>
      <div className="text-xs uppercase tracking-wide text-hs-muted">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}