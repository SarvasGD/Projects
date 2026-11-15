export interface CardData {
dbfId: number;
name: string;
cost: number;
type: string;
cardClass: string;
rarity?: string;
set?: string;
mechanics: string[];
referencedTags: string[];
text: string;
attack?: number;
health?: number;
race?: string;
image?: string;
}

export interface DeckCard {
dbfId: number;
count: number;
card?: CardData;
}

export interface Deck {
code: string;
heroClass: string;
format: string;
cards: DeckCard[];
signature: string;
}

export interface Minion {
card: CardData;
attack: number;
health: number;
maxHealth: number;
canAttack: boolean;
summonedThisTurn: boolean;
taunt: boolean;
divineShield: boolean;
windfury: boolean;
attacksUsed: number;
lifesteal: boolean;
}

export interface ActiveSecret {
card: CardData;
}

export interface PlayerState {
id: 'A' | 'B';
heroClass: string;
hp: number;
armor: number;
mana: number;
maxMana: number;
hand: CardData[];
deck: CardData[];
board: Minion[];
fatigue: number;
heroPowerLevel: number;
cardsPlayedThisTurn: number;
heroPowerUsed: boolean;
secrets: ActiveSecret[];
}

export type WinPath = 'aggro' | 'midrange' | 'control' | 'combo' | 'mixed';
export type Winner = 'A' | 'B' | 'draw';
export type DamageSource = 'minion' | 'spell' | 'fatigue' | 'hero_power';

export interface LogEntry {
turn: number;
player: 'A' | 'B';
action: 'play' | 'attack' | 'discover' | 'hero_power' | 'secret' | 'end';
detail: string;
hpA: number;
hpB: number;
boardA: number;
boardB: number;
}

export interface GameResult {
gameIndex: number;
winner: Winner;
turns: number;
hpRemainingA: number;
hpRemainingB: number;
winPathA: WinPath;
winPathB: WinPath;
finalBlowSource: DamageSource;
log: LogEntry[];
}

export interface SimOptions {
maxTurns?: number;
mulligan?: { keepBelowCost: number } | null;
}

export interface MatchupSummary {
games: number;
winrateA: number;
winrateB: number;
drawRate: number;
avgTurns: number;
avgHpOnWinA: number;
avgHpOnWinB: number;
turnDistribution: Record<number, number>;
winPathDistributionA: Record<WinPath, number>;
winPathDistributionB: Record<WinPath, number>;
winlineFastest: GameResult | null;
winlineLongest: GameResult | null;
winlineHighestHp: GameResult | null;
deckA: DeckSummary;
deckB: DeckSummary;
options: Required<SimOptions>;
}

export interface DeckSummary {
heroClass: string;
format: string;
cardCount: number;
avgCost: number;
manaCurve: Record<number, number>;
typeBreakdown: Record<string, number>;
cards: Array<{ dbfId: number; name: string; count: number; cost: number; image?: string }>;
}

export interface MatrixSummary {
decks: DeckSummary[];
matrix: number[][];
draws: number[][];
games: number;
options: Required<SimOptions>;
}

export interface Preset {
id: string;
name: string;
archetype: 'aggro' | 'tempo' | 'midrange' | 'control' | 'combo' | 'custom';
class: string;
code: string | null;
description: string;
}