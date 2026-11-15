import type {
CardData, Deck, GameResult, MatchupSummary, WinPath,
DeckSummary, SimOptions, MatrixSummary
} from "@/lib/types";
import { simulateGame } from "./engine";

function mulberry32(seed: number) {
return function () {
let t = (seed += 0x6d2b79f5);
t = Math.imul(t ^ (t >>> 15), t | 1);
t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}

export function summarizeDeck(deck: Deck): DeckSummary {
let totalCost = 0, cardCount = 0;
const manaCurve: Record<number, number> = {};
const typeBreakdown: Record<string, number> = {};
const cards: DeckSummary['cards'] = [];

for (const dc of deck.cards) {
if (!dc.card) continue;
const cost = dc.card.cost ?? 0;
totalCost += cost * dc.count;
cardCount += dc.count;
manaCurve[cost] = (manaCurve[cost] ?? 0) + dc.count;
typeBreakdown[dc.card.type] = (typeBreakdown[dc.card.type] ?? 0) + dc.count;
cards.push({
dbfId: dc.card.dbfId,
name: dc.card.name,
count: dc.count,
cost,
image: dc.card.image
});
}

return {
heroClass: deck.heroClass,
format: deck.format,
cardCount,
avgCost: cardCount > 0 ? totalCost / cardCount : 0,
manaCurve,
typeBreakdown,
cards
};
}

function buildSummary(
deckA: Deck,
deckB: Deck,
results: GameResult[],
games: number,
options: Required<SimOptions>
): MatchupSummary {
let winsA = 0, winsB = 0, draws = 0;
let totalTurns = 0, totalHpA = 0, totalHpB = 0;
const turnDist: Record<number, number> = {};
const pathA: Record<WinPath, number> = { aggro: 0, midrange: 0, control: 0, combo: 0, mixed: 0 };
const pathB: Record<WinPath, number> = { aggro: 0, midrange: 0, control: 0, combo: 0, mixed: 0 };

let fastest: GameResult | null = null;
let longest: GameResult | null = null;
let highestHp: GameResult | null = null;

for (const r of results) {
totalTurns += r.turns;
turnDist[r.turns] = (turnDist[r.turns] ?? 0) + 1;

if (r.winner === 'A') {
winsA++;
totalHpA += r.hpRemainingA;
pathA[r.winPathA]++;
} else if (r.winner === 'B') {
winsB++;
totalHpB += r.hpRemainingB;
pathB[r.winPathB]++;
} else {
draws++;
}

if (r.winner !== 'draw') {
if (!fastest || r.turns < fastest.turns) fastest = r;
if (!longest || r.turns > longest.turns) longest = r;
const rHp = r.winner === 'A' ? r.hpRemainingA : r.hpRemainingB;
const curHp = highestHp ? (highestHp.winner === 'A' ? highestHp.hpRemainingA : highestHp.hpRemainingB) : -1;
if (rHp > curHp) highestHp = r;
}
}

const normalize = (r: Record<WinPath, number>, total: number) => {
const out = { ...r };
for (const k of Object.keys(out) as WinPath[]) out[k] = total > 0 ? out[k] / total : 0;
return out;
};

return {
games,
winrateA: winsA / games,
winrateB: winsB / games,
drawRate: draws / games,
avgTurns: totalTurns / games,
avgHpOnWinA: winsA > 0 ? totalHpA / winsA : 0,
avgHpOnWinB: winsB > 0 ? totalHpB / winsB : 0,
turnDistribution: turnDist,
winPathDistributionA: normalize(pathA, winsA),
winPathDistributionB: normalize(pathB, winsB),
winlineFastest: fastest,
winlineLongest: longest,
winlineHighestHp: highestHp,
deckA: summarizeDeck(deckA),
deckB: summarizeDeck(deckB),
options
};
}

function normalizeOptions(options: SimOptions | undefined): Required<SimOptions> {
return {
maxTurns: options?.maxTurns ?? 30,
mulligan: options?.mulligan ?? null
};
}

export function simulateMatchup(
deckA: Deck,
deckB: Deck,
registry: Map<number, CardData>,
games: number = 200,
seed: number = Date.now(),
options?: SimOptions
): MatchupSummary {
const rng = mulberry32(seed);
const results: GameResult[] = [];
const normOpts = normalizeOptions(options);

for (let i = 0; i < games; i++) {
results.push(simulateGame(deckA, deckB, registry, rng, i, normOpts));
}

return buildSummary(deckA, deckB, results, games, normOpts);
}

export function simulateMatrix(
decks: Deck[],
registry: Map<number, CardData>,
games: number = 100,
seed: number = Date.now(),
options?: SimOptions
): MatrixSummary {
const n = decks.length;
const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
const draws: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
const normOpts = normalizeOptions(options);

for (let i = 0; i < n; i++) {
matrix[i][i] = 0.5;
draws[i][i] = 0;
}

for (let i = 0; i < n; i++) {
for (let j = i + 1; j < n; j++) {
const pairSeed = seed + i * 1000 + j;
const s = simulateMatchup(decks[i], decks[j], registry, games, pairSeed, normOpts);
matrix[i][j] = s.winrateA;
matrix[j][i] = s.winrateB;
draws[i][j] = s.drawRate;
draws[j][i] = s.drawRate;
}
}

return {
decks: decks.map(summarizeDeck),
matrix,
draws,
games,
options: normOpts
};
}