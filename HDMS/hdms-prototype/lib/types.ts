export interface DeckCard {
id: string;
count: number;
name?: string;
cost?: number;
type?: string;
class?: string;
}

export interface Deck {
code: string;
class: string;
format: string;
cards: DeckCard[];
}

export type WinPath = "aggro" | "combo" | "control" | "midrange" | "mixed";

export interface GameResult {
gameIndex: number;
winner: "A" | "B" | "draw";
turns: number;
hpRemainingA: number;
hpRemainingB: number;
winPathA: WinPath;
winPathB: WinPath;
}

export interface MatchupSummary {
deckA: Deck;
deckB: Deck;
games: number;
winrateA: number;
winrateB: number;
drawRate: number;
avgTurns: number;
avgHpOnWinA: number;
avgHpOnWinB: number;
winPathDistributionA: Record<WinPath, number>;
winPathDistributionB: Record<WinPath, number>;
turnDistribution: Record<number, number>;
results: GameResult[];
}