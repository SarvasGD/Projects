"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTests, deleteTest, clearTests } from "@/lib/history/db";
import type { TestRecord } from "@/lib/history/types";

export default function HistoryPage() {
const [records, setRecords] = useState<TestRecord[]>([]);
const [loading, setLoading] = useState(true);
const [expandedId, setExpandedId] = useState<string | null>(null);

async function refresh() {
setLoading(true);
try {
const all = await getTests();
setRecords(all);
} finally {
setLoading(false);
}
}

useEffect(() => {
void refresh();
}, []);

async function handleDelete(id: string) {
await deleteTest(id);
await refresh();
}

async function handleClearAll() {
if (!confirm("Удалить всю историю тестов?")) return;
await clearTests();
await refresh();
}

function exportRecord(rec: TestRecord) {
const blob = new Blob([JSON.stringify(rec, null, 2)], { type: "application/json" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `hdms-test-${rec.id}.json`;
a.click();
URL.revokeObjectURL(url);
}

return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="text-center py-4">
        <h1 className="text-3xl font-bold text-hs-gold">История тестов</h1>
        <p className="text-hs-muted text-sm mt-1">
          Все сохранённые матчапы · хранится в браузере (IndexedDB)
        </p>
        <div className="mt-3 flex gap-4 justify-center text-xs flex-wrap">
          <Link href="/" className="text-hs-blue hover:text-hs-gold underline">
            ← A vs B
          </Link>
          <Link href="/matrix" className="text-hs-blue hover:text-hs-gold underline">
            Матрица
          </Link>
          <Link href="/builder" className="text-hs-blue hover:text-hs-gold underline">
            Конструктор
          </Link>
        </div>
      </header>
{records.length > 0 && (
        <div className="flex justify-end">
          <button
            className="text-xs text-hs-red hover:underline"
            onClick={handleClearAll}
          >
            Очистить всё
          </button>
        </div>
      )}
{loading && (
        <div className="text-center text-hs-muted py-8">Загрузка…</div>
      )}
{!loading && records.length === 0 && (
        <div className="bg-hs-panel border border-hs-border rounded-lg p-8 text-center text-hs-muted">
          <div className="text-sm">История пуста.</div>
          <div className="text-xs mt-2">
            Запусти симуляцию и нажми «Сохранить тест» на странице результата.
          </div>
        </div>
      )}      <div className="space-y-3">
        {records.map((rec) => {
          const isExpanded = expandedId === rec.id;
          const totalWins = rec.summary.winrateA + rec.summary.winrateB;
          const adjA = totalWins > 0 ? rec.summary.winrateA / totalWins : 0;
          const adjB = totalWins > 0 ? rec.summary.winrateB / totalWins : 0;
          return (
            <div
              key={rec.id}
              className="bg-hs-panel border border-hs-border rounded-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-hs-muted">
                      {new Date(rec.timestamp).toLocaleString("ru-RU")}
                    </div>
                    <div className="text-sm font-bold mt-1">
                      <span className="text-hs-green">{rec.deckAClass}</span>
                      <span className="text-hs-muted"> vs </span>
                      <span className="text-hs-red">{rec.deckBClass}</span>
                    </div>
                    <div className="text-xs text-hs-muted mt-1">
                      {rec.summary.games} партий · max {rec.options.maxTurns} ходов ·{" "}
                      {rec.options.mulligan
                        ? `муллиган ≤${rec.options.mulligan.keepBelowCost}`
                        : "без муллигана"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-right">
                      <div className="text-hs-muted uppercase tracking-wide">A</div>
                      <div className="text-hs-green font-bold text-base">
                        {(rec.summary.winrateA * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-hs-muted uppercase tracking-wide">B</div>
                      <div className="text-hs-red font-bold text-base">
                        {(rec.summary.winrateB * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-hs-muted uppercase tracking-wide">Ничьи</div>
                      <div className="text-hs-muted font-bold text-base">
                        {(rec.summary.drawRate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="text-xs text-hs-blue hover:underline"
                    onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  >
                    {isExpanded ? "Свернуть" : "Подробнее"}
                  </button>
                  <button
                    className="text-xs text-hs-gold hover:underline"
                    onClick={() => exportRecord(rec)}
                  >
                    ⬇ JSON
                  </button>
                  <button
                    className="text-xs text-hs-red hover:underline ml-auto"
                    onClick={() => handleDelete(rec.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-hs-border bg-hs-bg/30 p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <DetailStat label="A без ничьих" value={`${(adjA * 100).toFixed(1)}%`} />
                    <DetailStat label="B без ничьих" value={`${(adjB * 100).toFixed(1)}%`} />
                    <DetailStat label="Ср. ходов" value={rec.summary.avgTurns.toFixed(1)} />
                    <DetailStat label="Ср. HP A" value={rec.summary.avgHpOnWinA.toFixed(1)} />
                  </div>
                  <div>
                    <div className="text-hs-muted mb-1">Колода A (код):</div>
                    <div className="font-mono text-[10px] break-all text-hs-muted bg-hs-bg p-2 rounded">
                      {rec.deckACode}
                    </div>
                  </div>
                  <div>
                    <div className="text-hs-muted mb-1">Колода B (код):</div>
                    <div className="font-mono text-[10px] break-all text-hs-muted bg-hs-bg p-2 rounded">
                      {rec.deckBCode}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
function DetailStat({ label, value }: { label: string; value: string }) {
return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-hs-muted">{label}</div>
      <div className="text-base font-bold text-hs-gold">{value}</div>
    </div>
  );
}