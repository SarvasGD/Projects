"use client";
import { useState } from "react";
import Link from "next/link";
import type { MatrixSummary, SimOptions } from "@/lib/types";
import { PRESETS } from "@/lib/presets";
import { DeckSlot, type SlotData } from "@/components/matrix/DeckSlot";

function emptySlot(): SlotData {
return {
id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
code: "",
heroClass: null,
format: null,
cardCount: null,
avgCost: null,
loading: false,
error: null
};
}

export default function MatrixPage() {
const [slots, setSlots] = useState<SlotData[]>([emptySlot(), emptySlot()]);
const [dragIdx, setDragIdx] = useState<number | null>(null);
const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
const [games, setGames] = useState(100);
const [maxTurns, setMaxTurns] = useState(30);
const [mulliganEnabled, setMulliganEnabled] = useState(false);
const [mulliganCost, setMulliganCost] = useState(2);
const [result, setResult] = useState<MatrixSummary | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

function updateSlot(idx: number, patch: Partial<SlotData>) {
setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
}

async function decodeSlot(idx: number) {
const slot = slots[idx];
const code = slot.code.trim();
if (!code) return;

updateSlot(idx, { loading: true, error: null, heroClass: null, cardCount: null });

try {
const res = await fetch("/api/deck/decode", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ code })
});
const data = await res.json();
if (!res.ok) throw new Error(data.error ?? "Неверный код");
updateSlot(idx, {
loading: false,
heroClass: data.heroClass,
format: data.format,
cardCount: data.cardCount,
avgCost: data.avgCost
});
} catch (err: unknown) {
updateSlot(idx, {
loading: false,
error: err instanceof Error ? err.message : "Ошибка декодирования"
});
}
}

function addDeck() {
if (slots.length >= 8) return;
setSlots([...slots, emptySlot()]);
}

function removeDeck(idx: number) {
if (slots.length <= 2) return;
setSlots(slots.filter((_, i) => i !== idx));
}

function onDragStart(idx: number) {
setDragIdx(idx);
}

function onDragOver(idx: number, e: React.DragEvent) {
e.preventDefault();
if (dragOverIdx !== idx) setDragOverIdx(idx);
}

function onDragLeave() {
setDragOverIdx(null);
}

function onDrop(idx: number) {
if (dragIdx === null || dragIdx === idx) {
setDragIdx(null);
setDragOverIdx(null);
return;
}
const next = [...slots];
const [moved] = next.splice(dragIdx, 1);
next.splice(idx, 0, moved);
setSlots(next);
setDragIdx(null);
setDragOverIdx(null);
setResult(null);
}

function addPreset(code: string) {
const emptyIdx = slots.findIndex((s) => !s.code.trim());
if (emptyIdx >= 0) {
updateSlot(emptyIdx, { code });
setTimeout(() => void decodeSlot(emptyIdx), 0);
} else if (slots.length < 8) {
const newSlot = { ...emptySlot(), code };
setSlots([...slots, newSlot]);
const idx = slots.length;
setTimeout(() => void decodeSlot(idx), 0);
}
}

async function run() {
setLoading(true);
setError("");
setResult(null);

const readySlots = slots.filter(
(s) => s.code.trim() && s.cardCount !== null && s.heroClass !== null
);

if (readySlots.length < 2) {
setError("Нужно минимум 2 готовых колоды");
setLoading(false);
return;
}

const options: SimOptions = {
maxTurns,
mulligan: mulliganEnabled ? { keepBelowCost: mulliganCost } : null
};

try {
const res = await fetch("/api/simulate-matrix", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
codes: readySlots.map((s) => s.code.trim()),
games,
options
})
});
const data = await res.json();
if (!res.ok) throw new Error(data.error ?? "Ошибка");
setResult(data);
} catch (err: unknown) {
setError(err instanceof Error ? err.message : "Ошибка");
} finally {
setLoading(false);
}
}

function exportJSON() {
if (!result) return;
const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `hdms-matrix-${Date.now()}.json`;
a.click();
URL.revokeObjectURL(url);
}

const readyCount = slots.filter((s) => s.cardCount !== null).length;
const canRun = !loading && readyCount >= 2;

return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="text-center py-4">
        <h1 className="text-3xl font-bold text-hs-gold">Матрица сравнения</h1>
        <p className="text-hs-muted text-sm mt-1">
          Drag-and-drop порядок · 2–8 колод · Winrate каждой против каждой
        </p>
        <div className="mt-3 flex gap-4 justify-center text-xs flex-wrap">
          <Link href="/" className="text-hs-blue hover:text-hs-gold underline">
            ← A vs B
          </Link>
          <Link href="/builder" className="text-hs-blue hover:text-hs-gold underline">
            Конструктор
          </Link>
          <Link href="/history" className="text-hs-blue hover:text-hs-gold underline">
            История
          </Link>
        </div>
      </header>      <section className="bg-hs-panel border border-hs-border rounded-lg p-3">
        <div className="text-xs text-hs-muted mb-2">Пресеты (клик — вставит в свободный слот):</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.filter((p) => p.code).map((p) => (
            <button
              key={p.id}
              className="text-xs px-2 py-1 rounded bg-hs-bg border border-hs-border text-hs-text hover:border-hs-gold"
              title={p.description}
              onClick={() => addPreset(p.code!)}
            >
              + {p.name}
            </button>
          ))}
        </div>
      </section>      <section className="space-y-2">
        <div className="text-xs text-hs-muted mb-1">
          Колоды (перетаскивай за ⋮⋮ для смены порядка):
        </div>
        {slots.map((slot, idx) => (
          <DeckSlot
            key={slot.id}
            slot={slot}
            index={idx}
            total={slots.length}
            isDragging={dragIdx === idx}
            isDragOver={dragOverIdx === idx && dragIdx !== idx}
            canRemove={slots.length > 2}
            onCodeChange={(code) => updateSlot(idx, { code })}
            onCodeSubmit={() => void decodeSlot(idx)}
            onRemove={() => removeDeck(idx)}
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(idx, e)}
            onDragLeave={onDragLeave}
            onDrop={() => onDrop(idx)}
          />
        ))}
        {slots.length < 8 && (
          <button
            className="w-full border border-dashed border-hs-border rounded-lg p-3 text-hs-muted hover:border-hs-gold hover:text-hs-gold text-sm"
            onClick={addDeck}
          >
            + Добавить колоду
          </button>
        )}
      </section>      <section className="bg-hs-panel border border-hs-border rounded-lg p-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-hs-muted mb-1">Партий на пару</label>
            <input
              type="number"
              className="bg-hs-bg border border-hs-border rounded px-3 py-2 w-full text-hs-text"
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
              className="bg-hs-bg border border-hs-border rounded px-3 py-2 w-full text-hs-text"
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
                className="bg-hs-bg border border-hs-border rounded px-2 py-1 w-14 text-hs-text text-xs"
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
      </section>      <section className="flex flex-wrap items-center gap-3 justify-center">
        <button
          className="bg-hs-gold text-hs-bg font-bold px-6 py-2 rounded hover:opacity-90 disabled:opacity-40 transition"
          onClick={run}
          disabled={!canRun}
        >
          {loading
            ? "Считаю матрицу…"
            : `Запустить (${readyCount}×${readyCount})`}
        </button>
        {result && (
          <button
            className="bg-hs-panel border border-hs-border text-hs-text px-4 py-2 rounded hover:border-hs-gold transition text-sm"
            onClick={exportJSON}
          >
            ⬇ Экспорт JSON
          </button>
        )}
      </section>
{error && (
        <div className="bg-hs-red/10 border border-hs-red/40 text-hs-red p-4 rounded">
          {error}
        </div>
      )}
{result && <MatrixTable summary={result} />}
    </main>
  );
}
function MatrixTable({ summary }: { summary: MatrixSummary }) {
const { decks, matrix, draws, games } = summary;
const n = decks.length;

function colorFor(w: number): string {
if (w >= 0.6) return "bg-hs-green/30 text-hs-green";
if (w >= 0.55) return "bg-hs-green/15 text-hs-green";
if (w <= 0.4) return "bg-hs-red/30 text-hs-red";
if (w <= 0.45) return "bg-hs-red/15 text-hs-red";
return "bg-hs-bg text-hs-text";
}

return (
    <section className="space-y-4 fade-in">
      <div className="bg-hs-panel border border-hs-border rounded-lg p-4 overflow-x-auto">
        <h2 className="text-lg font-bold text-hs-gold mb-3">Winrate матрица</h2>
        <div className="text-xs text-hs-muted mb-3">
          Строка — колода, столбец — противник. Значение — winrate строки против столбца.
        </div>
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-2 border border-hs-border text-xs text-hs-muted text-left">vs</th>
              {decks.map((d, j) => (
                <th key={j} className="p-2 border border-hs-border text-xs text-hs-gold">
                  #{j + 1}
                  <div className="text-[10px] text-hs-muted font-normal">
                    {d.heroClass.slice(0, 3)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {decks.map((rowDeck, i) => (
              <tr key={i}>
                <th className="p-2 border border-hs-border text-xs text-hs-gold text-left">
                  #{i + 1} {rowDeck.heroClass.slice(0, 3)}
                </th>
                {decks.map((_, j) => {
                  if (i === j) {
                    return (
                      <td
                        key={j}
                        className="p-2 border border-hs-border text-center text-xs text-hs-muted"
                      >
                        —
                      </td>
                    );
                  }
                  const w = matrix[i][j];
                  const d = draws[i][j];
                  return (
                    <td
                      key={j}
                      className={`p-2 border border-hs-border text-center text-xs font-bold ${colorFor(w)}`}
                      title={`Ничьи: ${(d * 100).toFixed(1)}%`}
                    >
                      {(w * 100).toFixed(1)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>      <div className="bg-hs-panel border border-hs-border rounded-lg p-4">
        <h2 className="text-sm font-bold text-hs-gold mb-2">Средний winrate (без ничьих)</h2>
        <div className="space-y-1">
          {decks.map((_, i) => {
            let sum = 0;
            let cnt = 0;
            for (let j = 0; j < n; j++) {
              if (i === j) continue;
              const w = matrix[i][j];
              const wb = matrix[j][i];
              const adjusted = w + wb > 0 ? w / (w + wb) : 0;
              sum += adjusted;
              cnt++;
            }
            const avg = cnt > 0 ? sum / cnt : 0;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-hs-muted min-w-[80px]">
                  #{i + 1} {decks[i].heroClass.slice(0, 8)}
                </span>
                <div className="flex-1 h-2 bg-hs-bg rounded overflow-hidden">
                  <div
                    className="h-full bg-hs-gold"
                    style={{ width: `${avg * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-hs-gold min-w-[50px] text-right">
                  {(avg * 100).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-xs text-yellow-200/80">
        Партий на пару: {games} · Model-based estimate. Диагональ не сравнивается (self-play).
      </div>
    </section>
  );
}