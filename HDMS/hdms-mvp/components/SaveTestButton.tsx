"use client";

import { useState } from "react";
import type { MatchupSummary } from "@/lib/types";
import { makeTestId, saveTest } from "@/lib/history/db";
import type { TestRecord } from "@/lib/history/types";

interface Props {
summary: MatchupSummary;
deckACode: string;
deckBCode: string;
}

export function SaveTestButton({ summary, deckACode, deckBCode }: Props) {
const [saved, setSaved] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");

async function handleSave() {
setSaving(true);
setError("");
try {
const record: TestRecord = {
id: makeTestId(),
timestamp: Date.now(),
deckACode,
deckBCode,
deckAClass: summary.deckA.heroClass,
deckBClass: summary.deckB.heroClass,
options: summary.options,
summary
};
await saveTest(record);
setSaved(true);
setTimeout(() => setSaved(false), 2000);
} catch (err: unknown) {
setError(err instanceof Error ? err.message : "Не удалось сохранить");
} finally {
setSaving(false);
}
}

return (
    <div className="flex items-center gap-2">
      <button
        className="bg-hs-panel border border-hs-border text-hs-text px-4 py-2 rounded hover:border-hs-gold transition text-sm disabled:opacity-40"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Сохраняю…" : saved ? "✓ Сохранено" : "💾 Сохранить тест"}
      </button>
      {error && <span className="text-hs-red text-xs">{error}</span>}
    </div>
  );
}