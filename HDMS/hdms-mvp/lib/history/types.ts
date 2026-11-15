import type { MatchupSummary, SimOptions } from "@/lib/types";

export interface TestRecord {
id: string;
timestamp: number;
label?: string;
deckACode: string;
deckBCode: string;
deckAClass: string;
deckBClass: string;
options: Required<SimOptions>;
summary: MatchupSummary;
}

export interface MatrixRecord {
id: string;
timestamp: number;
label?: string;
deckCodes: string[];
deckClasses: string[];
games: number;
options: Required<SimOptions>;
matrix: number[][];
draws: number[][];
averageWinrates: number[];
}