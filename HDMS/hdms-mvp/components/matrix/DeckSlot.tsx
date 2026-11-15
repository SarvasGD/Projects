"use client";

import { useRef } from "react";

export interface SlotData {
id: string;
code: string;
heroClass: string | null;
format: string | null;
cardCount: number | null;
avgCost: number | null;
loading: boolean;
error: string | null;
}

interface Props {
slot: SlotData;
index: number;
total: number;
isDragging: boolean;
isDragOver: boolean;
canRemove: boolean;
onCodeChange: (code: string) => void;
onCodeSubmit: (code: string) => void;
onRemove: () => void;
onDragStart: () => void;
onDragOver: (e: React.DragEvent) => void;
onDragLeave: () => void;
onDrop: () => void;
}

const CLASS_COLORS: Record<string, string> = {
ROGUE: "text-yellow-300",
MAGE: "text-blue-300",
WARRIOR: "text-red-400",
PALADIN: "text-yellow-200",
PRIEST: "text-gray-200",
HUNTER: "text-green-400",
WARLOCK: "text-purple-400",
DRUID: "text-orange-300",
SHAMAN: "text-blue-400",
DEMON_HUNTER: "text-emerald-400",
DEATH_KNIGHT: "text-cyan-300"
};

const CLASS_ICONS: Record<string, string> = {
ROGUE: "🗡",
MAGE: "🔥",
WARRIOR: "🛡",
PALADIN: "⚜",
PRIEST: "☩",
HUNTER: "🏹",
WARLOCK: "💀",
DRUID: "🌿",
SHAMAN: "⚡",
DEMON_HUNTER: "👁",
DEATH_KNIGHT: "❄"
};

export function DeckSlot({
slot,
index,
total,
isDragging,
isDragOver,
canRemove,
onCodeChange,
onCodeSubmit,
onRemove,
onDragStart,
onDragOver,
onDragLeave,
onDrop
}: Props) {
const dragHandleRef = useRef<HTMLDivElement>(null);

const hasCode = slot.code.trim().length > 0;
const isReady = slot.cardCount !== null && slot.heroClass !== null;

return (
    <div
      className={`relative bg-hs-panel border rounded-lg transition-all ${
        isDragOver
          ? "border-hs-gold ring-2 ring-hs-gold/50 scale-[1.02]"
          : "border-hs-border"
      } ${isDragging ? "opacity-40" : ""} ${!hasCode ? "border-dashed" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle */}
        {isReady && (
          <div
            ref={dragHandleRef}
            draggable
            onDragStart={onDragStart}
            className="cursor-grab active:cursor-grabbing text-hs-muted hover:text-hs-gold select-none pt-1"
            title="Перетащи, чтобы изменить порядок"
          >
            ⋮⋮
          </div>
        )}
{/* Slot number */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-hs-gold/20 border border-hs-gold/40 flex items-center justify-center text-xs font-bold text-hs-gold">
          {index + 1}
        </div>
{/* Content */}
        <div className="flex-1 min-w-0">
          <div>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 bg-hs-bg border border-hs-border rounded px-2 py-1.5 font-mono text-xs text-hs-text placeholder:text-hs-muted/60 focus:outline-none focus:border-hs-gold"
                value={slot.code}
                onChange={(e) => onCodeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCodeSubmit(slot.code);
                }}
                placeholder="Вставь deck-код"
                aria-label={`Код колоды ${index + 1}`}
              />
              <button
                type="button"
                className="shrink-0 px-3 py-1.5 rounded border border-hs-border text-xs text-hs-gold hover:border-hs-gold disabled:opacity-40"
                onClick={() => onCodeSubmit(slot.code)}
                disabled={!hasCode || slot.loading}
              >
                {slot.loading ? "…" : "Проверить"}
              </button>
            </div>
            <div className="text-[10px] text-hs-muted mt-1">
              Слот {index + 1} из {total} · после вставки нажми Enter или «Проверить»
            </div>
          </div>
{hasCode && slot.loading && (
            <div className="text-xs text-hs-muted pulse">Декодирую колоду…</div>
          )}
{hasCode && slot.error && (
            <div className="text-xs text-hs-red">{slot.error}</div>
          )}
{isReady && (
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-lg ${CLASS_COLORS[slot.heroClass!] ?? "text-hs-gold"}`}>
                  {CLASS_ICONS[slot.heroClass!] ?? "?"}
                </span>
                <span className={`text-sm font-bold ${CLASS_COLORS[slot.heroClass!] ?? "text-hs-gold"}`}>
                  {slot.heroClass}
                </span>
                {slot.format && (
                  <span className="text-[10px] uppercase text-hs-muted bg-hs-bg px-1.5 py-0.5 rounded">
                    {slot.format}
                  </span>
                )}
              </div>
              <div className="text-xs text-hs-muted mt-1">
                {slot.cardCount} карт · ср. мана {slot.avgCost?.toFixed(2)}
              </div>
              <div className="font-mono text-[10px] text-hs-muted/60 mt-1 truncate">
                {slot.code.slice(0, 40)}…
              </div>
            </div>
          )}
        </div>
{/* Remove */}
{canRemove && (
<button
className="text-hs-muted hover:text-hs-red text-lg leading-none flex-shrink-0"
onClick={onRemove}
title="Убрать колоду"

> 

×
</button>
)}
      </div>
    </div>
  );
}