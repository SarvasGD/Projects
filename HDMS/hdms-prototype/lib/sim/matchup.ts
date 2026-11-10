import type { Deck, GameResult, MatchupSummary, WinPath } from "@/lib/types";

/**

- PROTOTYPE SIMULATOR.
- This is a simplified model that estimates matchup outcomes based on deck
- composition heuristics. It does NOT implement full Hearthstone rules.
- 
- For each deck, we compute a "path profile": an estimate of how likely the deck
- is to win through each win path (aggro, combo, control, midrange, mixed).
- Then for each simulated game, we sample a path for each deck, compare their
- "path strength", and determine a winner.
*/

function estimatePathProfile(deck: Deck): Record<WinPath, number> {
// Heuristic: count cards by cost to infer archetype tendencies.
let lowCost = 0;
let midCost = 0;
let highCost = 0;
let total = 0;

for (const card of deck.cards) {
const cost = card.cost ?? 3; // fallback if cost unknown
if (cost <= 2) lowCost += card.count;
else if (cost <= 5) midCost += card.count;
else highCost += card.count;
total += card.count;
}

const lowRatio = total > 0 ? lowCost / total : 0.33;
const midRatio = total > 0 ? midCost / total : 0.33;
const highRatio = total > 0 ? highCost / total : 0.34;

// Normalize to probabilities (sum to 1)
const agg = lowRatio * 1.2;
const mid = midRatio * 1.0;
const ctrl = highRatio * 1.1;
const combo = midRatio * 0.8 + highRatio * 0.3; // combo often needs mid/high pieces
const mixed = (agg + mid + ctrl + combo) * 0.1;

const sum = agg + mid + ctrl + combo + mixed;
return {
aggro: sum > 0 ? agg / sum : 0.2,
midrange: sum > 0 ? mid / sum : 0.2,
control: sum > 0 ? ctrl / sum : 0.2,
combo: sum > 0 ? combo / sum : 0.2,
mixed: sum > 0 ? mixed / sum : 0.2,
};
}

function samplePath(profile: Record<WinPath, number>, rng: () => number): WinPath {
const r = rng();
let cumulative = 0;
const paths: WinPath[] = ["aggro", "midrange", "control", "combo", "mixed"];
for (const path of paths) {
cumulative += profile[path];
if (r <= cumulative) return path;
}
return "mixed";
}

function pathStrength(path: WinPath, opponentPath: WinPath): number {
// Simplified matchup matrix: how strong is `path` against `opponentPath`?
// Higher is better. Values are arbitrary but capture basic dynamics.
const matrix: Record<WinPath, Record<WinPath, number>> = {
aggro:   { aggro: 0.5, midrange: 0.7, control: 0.3, combo: 0.6, mixed: 0.5 },
midrange:{ aggro: 0.3, midrange: 0.5, control: 0.6, combo: 0.4, mixed: 0.5 },
control: { aggro: 0.7, midrange: 0.4, control: 0.5, combo: 0.6, mixed: 0.5 },
combo:   { aggro: 0.4, midrange: 0.6, control: 0.4, combo: 0.5, mixed: 0.5 },
mixed:   { aggro: 0.5, midrange: 0.5, control: 0.5, combo: 0.5, mixed: 0.5 },
};
return matrix[path]?.[opponentPath] ?? 0.5;
}

function mulberry32(seed: number) {
return function () {
let t = (seed += 0x6d2b79f5);
t = Math.imul(t ^ (t >>> 15), t | 1);
t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}

export function simulateMatchup(
deckA: Deck,
deckB: Deck,
games: number = 1000,
seed: number = 42
): MatchupSummary {
const rng = mulberry32(seed);
const profileA = estimatePathProfile(deckA);
const profileB = estimatePathProfile(deckB);

const results: GameResult[] = [];
let winsA = 0;
let winsB = 0;
let draws = 0;
let totalTurns = 0;
let totalHpA = 0;
let totalHpB = 0;
const winPathCountA: Record<WinPath, number> = { aggro: 0, midrange: 0, control: 0, combo: 0, mixed: 0 };
const winPathCountB: Record<WinPath, number> = { aggro: 0, midrange: 0, control: 0, combo: 0, mixed: 0 };
const turnDist: Record<number, number> = {};

for (let i = 0; i < games; i++) {
const pathA = samplePath(profileA, rng);
const pathB = samplePath(profileB, rng);

const strengthA = pathStrength(pathA, pathB);
const strengthB = pathStrength(pathB, pathA);

// Add some randomness to simulate variance
const rollA = strengthA + (rng() - 0.5) * 0.4;
const rollB = strengthB + (rng() - 0.5) * 0.4;

let winner: "A" | "B" | "draw";
if (Math.abs(rollA - rollB) < 0.05) {
winner = "draw";
draws++;
} else if (rollA > rollB) {
winner = "A";
winsA++;
winPathCountA[pathA]++;
} else {
winner = "B";
winsB++;
winPathCountB[pathB]++;
}

// Simulate turn count based on path (aggro ends faster)
const baseTurns = pathA === "aggro" || pathB === "aggro" ? 6 : pathA === "combo" || pathB === "combo" ? 9 : 8;
const turns = Math.max(4, Math.round(baseTurns + (rng() - 0.5) * 4));
totalTurns += turns;
turnDist[turns] = (turnDist[turns] ?? 0) + 1;

// HP remaining: winner keeps more HP if control/midrange, less if aggro
const hpWinner = winner === "A"
? Math.round(30 - (pathA === "aggro" ? rng() * 10 : rng() * 5))
: Math.round(30 - (pathB === "aggro" ? rng() * 10 : rng() * 5));
const hpLoser = 0;

const hpA = winner === "A" ? hpWinner : hpLoser;
const hpB = winner === "B" ? hpWinner : hpLoser;
if (winner === "A") totalHpA += hpA;
if (winner === "B") totalHpB += hpB;

results.push({
gameIndex: i,
winner,
turns,
hpRemainingA: hpA,
hpRemainingB: hpB,
winPathA: pathA,
winPathB: pathB,
});
}

const winrateA = winsA / games;
const winrateB = winsB / games;
const drawRate = draws / games;

const winPathDistributionA = Object.fromEntries(
Object.entries(winPathCountA).map(([k, v]) => [k, winsA > 0 ? v / winsA : 0])
) as Record<WinPath, number>;
const winPathDistributionB = Object.fromEntries(
Object.entries(winPathCountB).map(([k, v]) => [k, winsB > 0 ? v / winsB : 0])
) as Record<WinPath, number>;

return {
deckA,
deckB,
games,
winrateA,
winrateB,
drawRate,
avgTurns: totalTurns / games,
avgHpOnWinA: winsA > 0 ? totalHpA / winsA : 0,
avgHpOnWinB: winsB > 0 ? totalHpB / winsB : 0,
winPathDistributionA,
winPathDistributionB,
turnDistribution: turnDist,
results,
};
}