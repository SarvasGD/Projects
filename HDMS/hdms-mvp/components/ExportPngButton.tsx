"use client";
import { useState } from "react";
import { exportElementAsPNG } from "@/lib/export/png";

interface Props {
elementId: string;
filename: string;
}

export function ExportPngButton({ elementId, filename }: Props) {
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleClick() {
setLoading(true);
setError("");
try {
await exportElementAsPNG(elementId, filename);
} catch (err: unknown) {
setError(err instanceof Error ? err.message : "Ошибка экспорта");
} finally {
setLoading(false);
}
}

return (
    <div className="flex items-center gap-2">
      <button
        className="bg-hs-panel border border-hs-border text-hs-text px-4 py-2 rounded hover:border-hs-gold transition text-sm disabled:opacity-40"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Рендерю…" : "🖼 Экспорт PNG"}
      </button>
      {error && <span className="text-hs-red text-xs">{error}</span>}
    </div>
  );
}