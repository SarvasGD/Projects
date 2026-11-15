"use client";
import { useState } from "react";
import Link from "next/link";
import type { MatchupSummary, SimOptions } from "@/lib/types";
import { PRESETS } from "@/lib/presets";
import { SaveTestButton } from "@/components/SaveTestButton";
import { ExportPngButton } from "@/components/ExportPngButton";
import { simulateParallel } from "@/lib/sim/parallel";
import { matchupWorker } from "@/lib/sim/clientWorker";

export default function Home() {
const [codeA, setCodeA] = useState("");
const [codeB, setCodeB] = useState("");
const [games, setGames] = useState(200);
const [maxTurns, setMaxTurns] = useState(30);
const [mulliganEnabled, setMulliganEnabled] = useState(false);
const [mulliganCost, setMulliganCost] = useState(2);
const [parallel, setParallel] = useState(false);
const [useWorker, setUseWorker] = useState(false);
const [result, setResult] = useState<MatchupSummary | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [elapsed, setElapsed] = useState(0);
const [mode, setMode] = useState<"server" | "worker" | "parallel" | null>(null);

async function runSimulation() {
setLoading(true);
setError("");
setResult(null);
setElapsed(0);
setMode(null);
const start = Date.now();
const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);

const options: SimOptions = {
maxTurns,
mulligan: mulliganEnabled ? { keepBelowCost: mulliganCost } : null
};

try {
if (useWorker) {
setMode("worker");
try {
const data = await matchupWorker.run(codeA, codeB, games, options);
setResult(data);
return;
} catch (workerErr) {
console.warn("Worker failed, falling back to server:", workerErr);
// fall through to server
}
}

if (parallel && games >= 400) {
setMode("parallel");
const data = await simulateParallel(codeA, codeB, games, options, 4);
setResult(data);
} else {
setMode("server");
const res = await fetch("/api/simulate", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ codeA, codeB, games, options })
});
const data = await res.json();
if (!res.ok) throw new Error(data.error ?? "Ошибка симуляции");
setResult(data);
}
} catch (err: unknown) {
setError(err instanceof Error ? err.message : "Неизвестная ошибка");
} finally {
clearInterval(timer);
setLoading(false);
}
}

function exportJSON() {
if (!result) return;
const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `hdms-${Date.now()}.json`;
a.click();
URL.revokeObjectURL(url);
}

return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="text-center py-4">
        <h1 className="text-4xl font-bold text-hs-gold">HDMS</h1>
        <p className="text-hs-muted text-sm mt-1">
          Симулятор матчапов Hearthstone · Model-based estimate
        </p>
        <div className="mt-3 flex gap-4 justify-center text-xs flex-wrap">
          <Link href="/builder" className="text-hs-gold hover:underline font-bold">
            ⚒ Конструктор →
          </Link>
          <Link href="/matrix" className="text-hs-blue hover:text-hs-gold underline">
            Матрица →
          </Link>
          <Link href="/history" className="text-hs-blue hover:text-hs-gold underline">
            История →
          </Link>
        </div>
      </header>
<PresetsBar onPick={(code, which) => (which === "A" ? setCodeA(code) : setCodeB(code))} />
      <section className="grid md:grid-cols-2 gap-4">
        <DeckInput label="Колода A" value={codeA} onChange={setCodeA} />
        <DeckInput label="Колода B" value={codeB} onChange={setCodeB} />
      </section>      <section className="bg-hs-panel border border-hs-border rounded-lg p-4">
        <h3 className="text-sm font-bold text-hs-gold mb-3">Правила симуляции</h3>
        <div className="grid md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-hs-muted mb-1">Партий</label>
            <input
              type="number"
              className="bg-hs-bg border border-hs-border rounded px-3 py-2 w-full text-hs-text"
              value={games}
              min={20}
              max={4000}
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
              step={1}
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
              <span className="text-xs text-hs-text">≤</span>
              <input
                type="number"
                className="bg-hs-bg border border-hs-border rounded px-2 py-1 w-14 text-hs-text text-xs"
                value={mulliganCost}
                min={0}
                max={5}
                disabled={!mulliganEnabled}
                onChange={(e) => setMulliganCost(Number(e.target.value))}
              />
              <span className="text-xs text-hs-text">маны</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-hs-muted mb-1">Параллельно</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={parallel}
                onChange={(e) => setParallel(e.target.checked)}
                className="w-4 h-4"
                disabled={games < 400 || useWorker}
              />
              <span className="text-xs text-hs-text">
                {games < 400 ? "от 400" : "4 батча"}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-hs-muted mb-1">Web Worker</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useWorker}
                onChange={(e) => {
                  setUseWorker(e.target.checked);
                  if (e.target.checked) setParallel(false);
                }}
                className="w-4 h-4"
              />
              <span className="text-xs text-hs-text">в браузере</span>
            </div>
          </div>
        </div>
      </section>      <section className="flex flex-wrap items-center gap-3 justify-center">
        <button
          className="bg-hs-gold text-hs-bg font-bold px-6 py-2 rounded hover:opacity-90 disabled:opacity-40 transition"
          onClick={runSimulation}
          disabled={loading || !codeA || !codeB}
        >
          {loading ? `Симуляция… ${elapsed}с` : "Запустить симуляцию"}
        </button>
        {result && (
          <>
            <button
              className="bg-hs-panel border border-hs-border text-hs-text px-4 py-2 rounded hover:border-hs-gold transition text-sm"
              onClick={exportJSON}
            >
              ⬇ JSON
            </button>
            <ExportPngButton elementId="result-panel" filename={`hdms-${Date.now()}.png`} />
            <SaveTestButton summary={result} deckACode={codeA} deckBCode={codeB} />
          </>
        )}
      </section>
{loading && (
        <div className="text-center text-hs-muted pulse">
          {mode === "worker"
            ? `Worker: считаю ${games} партий в браузере. Первый запуск — загрузка базы карт ~10 сек.`
            : mode === "parallel"
            ? `Считаю ${games} партий в 4 параллельных батча…`
            : "Загружаю базу карт и считаю партии. Первый запуск может занять 10-30 секунд."}
        </div>
      )}
{result && mode && (
        <div className="text-center text-xs text-hs-muted">
          Режим: {mode === "worker" ? "🖥 Web Worker (браузер)" : mode === "parallel" ? "⚡ Параллельно (сервер)" : "☁ Сервер"}
        </div>
      )}
{error && (
        <div className="bg-hs-red/10 border border-hs-red/40 text-hs-red p-4 rounded">
          {error}
        </div>
      )}
{result && (
        <div id="result-panel">
          <ResultPanel summary={result} />
        </div>
      )}
    </main>
  );
}
function PresetsBar({ onPick }: { onPick: (code: string, which: "A" | "B") => void }) {
return (
    <section className="bg-hs-panel border border-hs-border rounded-lg p-3">
      <div className="text-xs text-hs-muted mb-2">Пресеты (клик — выбрать, куда вставить):</div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <div key={p.id} className="flex items-stretch">
            <span
              className={`text-xs px-2 py-1 rounded-l border border-hs-border ${
                p.code ? "bg-hs-bg text-hs-text" : "bg-hs-bg text-hs-muted italic"
              }`}
              title={p.description}
            >
              {p.name}
            </span>
            {p.code ? (
              <>
                <button
                  className="text-xs px-2 py-1 bg-hs-blue/20 text-hs-blue border border-hs-border border-l-0 hover:bg-hs-blue/30"
                  onClick={() => onPick(p.code!, "A")}
                  title="Вставить в колоду A"
                >
                  →A
                </button>
                <button
                  className="text-xs px-2 py-1 bg-hs-blue/20 text-hs-blue border border-hs-border border-l-0 rounded-r hover:bg-hs-blue/30"
                  onClick={() => onPick(p.code!, "B")}
                  title="Вставить в колоду B"
                >
                  →B
                </button>
              </>
            ) : (
              <span className="text-[10px] px-2 py-1 bg-hs-bg text-hs-muted border border-hs-border border-l-0 rounded-r">
                код не задан
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
function DeckInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
return (
    <div className="bg-hs-panel border border-hs-border rounded-lg p-4">
      <label className="block text-sm font-medium text-hs-gold mb-2">{label}</label>
      <textarea
        className="w-full bg-hs-bg border border-hs-border rounded p-3 h-32 font-mono text-xs text-hs-text resize-none focus:outline-none focus:border-hs-gold"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Вставь код колоды"
      />
    </div>
  );
}
function ResultPanel({ summary }: { summary: MatchupSummary }) {
const totalWins = summary.winrateA + summary.winrateB;
const adjustedA = totalWins > 0 ? summary.winrateA / totalWins : 0;
const adjustedB = totalWins > 0 ? summary.winrateB / totalWins : 0;

return (
    <section className="space-y-6 fade-in">
      <div className="bg-hs-panel border border-hs-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-hs-gold mb-4">Результат</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Победы A" value={`${(summary.winrateA * 100).toFixed(1)}%`} color="text-hs-green" />
          <Stat label="Победы B" value={`${(summary.winrateB * 100).toFixed(1)}%`} color="text-hs-red" />
          <Stat label="Ничьи" value={`${(summary.drawRate * 100).toFixed(1)}%`} color="text-hs-muted" />
          <Stat label="Средн. ходов" value={summary.avgTurns.toFixed(1)} color="text-hs-blue" />
          <Stat label="A без ничьих" value={`${(adjustedA * 100).toFixed(1)}%`} />
          <Stat label="B без ничьих" value={`${(adjustedB * 100).toFixed(1)}%`} />
          <Stat label="Ср. HP A" value={summary.avgHpOnWinA.toFixed(1)} />
          <Stat label="Ср. HP B" value={summary.avgHpOnWinB.toFixed(1)} />
        </div>
        <div className="mt-4 text-xs text-hs-muted">
          Правила: max {summary.options.maxTurns} ходов ·{" "}
          {summary.options.mulligan
            ? `муллиган ≤${summary.options.mulligan.keepBelowCost} маны`
            : "без муллигана"}
        </div>
      </div>      <div className="grid md:grid-cols-2 gap-4">
        <WinPathCard title="Пути победы A" distribution={summary.winPathDistributionA} color="green" />
        <WinPathCard title="Пути победы B" distribution={summary.winPathDistributionB} color="red" />
      </div>      <TurnChart distribution={summary.turnDistribution} />      <div className="grid md:grid-cols-2 gap-4">
        <DeckSummaryCard title="Колода A" summary={summary.deckA} />
        <DeckSummaryCard title="Колода B" summary={summary.deckB} />
      </div>      <div className="space-y-4">
        <h3 className="text-lg font-bold text-hs-gold">Winlines</h3>
        {summary.winlineFastest && <WinlineCard title="Самая быстрая победа" game={summary.winlineFastest} />}
        {summary.winlineHighestHp && <WinlineCard title="Победа с макс. HP" game={summary.winlineHighestHp} />}
        {summary.winlineLongest && <WinlineCard title="Самая долгая партия" game={summary.winlineLongest} />}
      </div>      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-xs text-yellow-200/80">
        <strong>Model-based estimate.</strong> Упрощения: Discover выбирает 1/3 best/average/worst из пула по мане.
        Секреты, сложные эффекты и трансформации не учитываются. Результаты для сравнительного анализа.
      </div>
    </section>
  );
}
function Stat({ label, value, color = "text-hs-text" }: { label: string; value: string; color?: string }) {
return (
    <div>
      <div className="text-xs uppercase tracking-wide text-hs-muted">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
function WinPathCard({ title, distribution, color }: { title: string; distribution: Record<string, number>; color: "green" | "red" }) {
const labels: Record<string, string> = {
aggro: "Агро", midrange: "Мидрейндж", control: "Контроль", combo: "Комбо", mixed: "Смешанный"
};
return (
    <div className="bg-hs-panel border border-hs-border rounded-lg p-4">
      <h3 className={`text-sm font-bold mb-3 ${color === "green" ? "text-hs-green" : "text-hs-red"}`}>{title}</h3>
      <div className="space-y-2">
        {Object.entries(distribution).map(([path, prob]) => (
          <div key={path}>
            <div className="flex justify-between text-xs mb-1">
              <span>{labels[path]}</span>
              <span className="text-hs-muted">{(prob * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-hs-bg rounded overflow-hidden">
              <div
                className={color === "green" ? "h-full bg-hs-green" : "h-full bg-hs-red"}
                style={{ width: `${prob * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function TurnChart({ distribution }: { distribution: Record<number, number> }) {
const entries = Object.entries(distribution).map(([t, c]) => ({ turn: Number(t), count: c })).sort((a, b) => a.turn - b.turn);
const max = Math.max(...entries.map((e) => e.count));
return (
    <div className="bg-hs-panel border border-hs-border rounded-lg p-4">
      <h3 className="text-sm font-bold text-hs-gold mb-3">Распределение по ходам</h3>
      <div className="flex items-end gap-1 h-32">
        {entries.map((e) => (
          <div key={e.turn} className="flex-1 flex flex-col items-center justify-end">
            <div
              className="w-full bg-hs-blue rounded-t hover:bg-hs-gold transition"
              style={{ height: `${(e.count / max) * 100}%` }}
              title={`Ход ${e.turn}: ${e.count} партий`}
            />
            <span className="text-xs mt-1 text-hs-muted">{e.turn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function DeckSummaryCard({ title, summary }: { title: string; summary: import("@/lib/types").DeckSummary }) {
return (
    <div className="bg-hs-panel border border-hs-border rounded-lg p-4">
      <h3 className="text-sm font-bold text-hs-gold mb-2">{title} — {summary.heroClass}</h3>
      <div className="text-xs text-hs-muted mb-3">
        {summary.cardCount} карт · средняя мана {summary.avgCost.toFixed(2)}
      </div>
      <div className="flex gap-1 mb-3 overflow-x-auto pb-2">
        {Object.entries(summary.manaCurve)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([cost, count]) => (
            <div key={cost} className="flex flex-col items-center min-w-[28px]">
              <div className="text-xs text-hs-gold font-bold">{count}</div>
              <div className="text-[10px] text-hs-muted">{cost}</div>
            </div>
          ))}
      </div>
      <div className="max-h-40 overflow-y-auto text-xs space-y-1">
        {summary.cards.sort((a, b) => a.cost - b.cost).map((c) => (
          <div key={c.dbfId} className="flex justify-between text-hs-muted">
            <span className="truncate">{c.name}</span>
            <span className="text-hs-gold ml-2">×{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function WinlineCard({ title, game }: { title: string; game: import("@/lib/types").GameResult }) {
const [open, setOpen] = useState(false);
return (
    <div className="bg-hs-panel border border-hs-border rounded-lg overflow-hidden">
      <button
        className="w-full text-left p-3 flex justify-between items-center hover:bg-hs-border/20"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-bold">{title}</span>
        <span className="text-xs text-hs-muted">
          Победа {game.winner} · {game.turns} ходов · HP A {game.hpRemainingA} / B {game.hpRemainingB}
        </span>
      </button>
      {open && (
        <div className="p-3 border-t border-hs-border bg-hs-bg/50 max-h-80 overflow-y-auto">
          {game.log.map((entry, i) => (
            <div key={i} className="text-xs py-1 flex gap-2 border-b border-hs-border/30 last:border-0">
              <span className="text-hs-gold min-w-[40px]">Ход {entry.turn}</span>
              <span className={entry.player === "A" ? "text-hs-green" : "text-hs-red"}>
                {entry.player}
              </span>
              <span className="flex-1 text-hs-text">{entry.detail}</span>
              <span className="text-hs-muted">HP {entry.hpA}/{entry.hpB}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}