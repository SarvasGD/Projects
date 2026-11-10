"use client";

import { useState } from "react";
import type { MatchupSummary } from "@/lib/types";

export default function Home() {
const [codeA, setCodeA] = useState("");
const [codeB, setCodeB] = useState("");
const [games, setGames] = useState(1000);
const [result, setResult] = useState<MatchupSummary | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function runSimulation() {
setLoading(true);
setError("");
setResult(null);
try {
const res = await fetch("/api/simulate", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ codeA, codeB, games }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error ?? "Simulation failed");
setResult(data);
} catch (err: unknown) {
setError(err instanceof Error ? err.message : "Unknown error");
} finally {
setLoading(false);
}
}

return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">HDMS Prototype</h1>
        <p className="text-gray-600">
          Model-based matchup simulator. Paste two Standard deck codes below.
        </p>        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Deck A</label>
            <textarea
              className="w-full border rounded p-2 h-24 font-mono text-sm"
              value={codeA}
              onChange={(e) => setCodeA(e.target.value)}
              placeholder="Paste deck code A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deck B</label>
            <textarea
              className="w-full border rounded p-2 h-24 font-mono text-sm"
              value={codeB}
              onChange={(e) => setCodeB(e.target.value)}
              placeholder="Paste deck code B"
            />
          </div>
        </div>        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Games:</label>
          <input
            type="number"
            className="border rounded p-1 w-24"
            value={games}
            min={100}
            max={20000}
            step={100}
            onChange={(e) => setGames(Number(e.target.value))}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={runSimulation}
            disabled={loading || !codeA || !codeB}
          >
            {loading ? "Simulating…" : "Run Matchup"}
          </button>
        </div>
{error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

{result && (
          <div className="space-y-6">
            <div className="bg-white border rounded p-4">
              <h2 className="text-xl font-semibold mb-2">Result</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Winrate A" value={`${(result.winrateA * 100).toFixed(1)}%`} />
                <Stat label="Winrate B" value={`${(result.winrateB * 100).toFixed(1)}%`} />
                <Stat label="Draw rate" value={`${(result.drawRate * 100).toFixed(1)}%`} />
                <Stat label="Avg. turns" value={result.avgTurns.toFixed(1)} />
                <Stat label="Avg. HP on win A" value={result.avgHpOnWinA.toFixed(1)} />
                <Stat label="Avg. HP on win B" value={result.avgHpOnWinB.toFixed(1)} />
                <Stat label="Games" value={result.games.toString()} />
              </div>
            </div>            <div className="bg-white border rounded p-4">
              <h2 className="text-xl font-semibold mb-2">Win Path Distribution (A)</h2>
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {Object.entries(result.winPathDistributionA).map(([path, prob]) => (
                  <div key={path} className="border rounded p-2">
                    <div className="font-medium capitalize">{path}</div>
                    <div>{(prob * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>            <div className="bg-white border rounded p-4">
              <h2 className="text-xl font-semibold mb-2">Win Path Distribution (B)</h2>
              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                {Object.entries(result.winPathDistributionB).map(([path, prob]) => (
                  <div key={path} className="border rounded p-2">
                    <div className="font-medium capitalize">{path}</div>
                    <div>{(prob * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>            <div className="bg-white border rounded p-4">
              <h2 className="text-xl font-semibold mb-2">Turn Distribution</h2>
              <div className="flex items-end gap-1 h-32">
                {Object.entries(result.turnDistribution)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([turn, count]) => {
                    const max = Math.max(...Object.values(result.turnDistribution));
                    const height = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={turn} className="flex-1 flex flex-col items-center justify-end">
                        <div
                          className="w-full bg-blue-400 rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${turn}: ${count}`}
                        />
                        <span className="text-xs mt-1">{turn}</span>
                      </div>
                    );
                  })}
              </div>
            </div>            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
              <strong>Model-based estimate.</strong> This prototype uses simplified heuristics, not full Hearthstone rules.
              Win paths are estimated from deck composition. Results are for comparative purposes only.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
return (
    <div>
      <div className="text-gray-500 text-xs uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}