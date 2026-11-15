import type { MatchupSummary, SimOptions, GameResult, WinPath } from "@/lib/types";

/**

- Merge N partial matchup summaries (computed with different seeds)
- into one combined summary.
*/
export function mergeSummaries(parts: MatchupSummary[]): MatchupSummary {
if (parts.length === 0) throw new Error("Нечего объединять");
if (parts.length === 1) return parts[0];

const totalGames = parts.reduce((s, p) => s + p.games, 0);
const winsA = parts.reduce((s, p) => s + p.winrateA * p.games, 0);
const winsB = parts.reduce((s, p) => s + p.winrateB * p.games, 0);
const draws = parts.reduce((s, p) => s + p.drawRate * p.games, 0);
const totalTurns = parts.reduce((s, p) => s + p.avgTurns * p.games, 0);
const totalHpA = parts.reduce((s, p) => s + p.avgHpOnWinA * (p.winrateA * p.games), 0);
const totalHpB = parts.reduce((s, p) => s + p.avgHpOnWinB * (p.winrateB * p.games), 0);

const turnDist: Record<number, number> = {};
for (const p of parts) {
for (const [t, c] of Object.entries(p.turnDistribution)) {
const key = Number(t);
turnDist[key] = (turnDist[key] ?? 0) + c;
}
}

const mergePathDist = (key: "winPathDistributionA" | "winPathDistributionB", winsTotal: number) => {
const result: Record<WinPath, number> = { aggro: 0, midrange: 0, control: 0, combo: 0, mixed: 0 };
for (const p of parts) {
const partWins = key === "winPathDistributionA" ? p.winrateA * p.games : p.winrateB * p.games;
for (const path of Object.keys(p[key]) as WinPath[]) {
result[path] += p[key][path] * partWins;
}
}
for (const path of Object.keys(result) as WinPath[]) {
result[path] = winsTotal > 0 ? result[path] / winsTotal : 0;
}
return result;
};

const winPathA = mergePathDist("winPathDistributionA", winsA);
const winPathB = mergePathDist("winPathDistributionB", winsB);

const winlineFastest = parts
.map((p) => p.winlineFastest)
.filter((w): w is GameResult => w !== null)
.reduce<GameResult | null>((best, cur) => (!best || cur.turns < best.turns ? cur : best), null);

const winlineLongest = parts
.map((p) => p.winlineLongest)
.filter((w): w is GameResult => w !== null)
.reduce<GameResult | null>((best, cur) => (!best || cur.turns > best.turns ? cur : best), null);

const winlineHighestHp = parts
.map((p) => p.winlineHighestHp)
.filter((w): w is GameResult => w !== null)
.reduce<GameResult | null>((best, cur) => {
if (!best) return cur;
const curHp = cur.winner === "A" ? cur.hpRemainingA : cur.hpRemainingB;
const bestHp = best.winner === "A" ? best.hpRemainingA : best.hpRemainingB;
return curHp > bestHp ? cur : best;
}, null);

return {
games: totalGames,
winrateA: winsA / totalGames,
winrateB: winsB / totalGames,
drawRate: draws / totalGames,
avgTurns: totalTurns / totalGames,
avgHpOnWinA: winsA > 0 ? totalHpA / winsA : 0,
avgHpOnWinB: winsB > 0 ? totalHpB / winsB : 0,
turnDistribution: turnDist,
winPathDistributionA: winPathA,
winPathDistributionB: winPathB,
winlineFastest,
winlineLongest,
winlineHighestHp,
deckA: parts[0].deckA,
deckB: parts[0].deckB,
options: parts[0].options
};
}

/**

- Run matchup via N parallel API calls with different seeds, then merge.
- Useful for large `games` counts (e.g. 2000 → 4 batches of 500).
*/
export async function simulateParallel(
codeA: string,
codeB: string,
totalGames: number,
options: SimOptions,
batches = 4
): Promise<MatchupSummary> {
const batchSize = Math.max(1, Math.ceil(totalGames / batches));
const actualBatches = Math.ceil(totalGames / batchSize);

const promises: Promise<MatchupSummary>[] = [];
for (let i = 0; i < actualBatches; i++) {
const gamesThisBatch = i === actualBatches - 1
? totalGames - batchSize * (actualBatches - 1)
: batchSize;
if (gamesThisBatch <= 0) continue;

promises.push(
fetch("/api/simulate", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
codeA,
codeB,
games: gamesThisBatch,
seed: Date.now() + i * 1000 + Math.floor(Math.random() * 1000),
options
})
}).then(async (res) => {
const data = await res.json();
if (!res.ok) throw new Error(data.error ?? "Ошибка батча");
return data as MatchupSummary;
})
);
}

const parts = await Promise.all(promises);
return mergeSummaries(parts);
}