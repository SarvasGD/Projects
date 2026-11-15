import type {
CardData, Deck, GameResult, LogEntry, PlayerState,
Winner, WinPath, DamageSource, SimOptions, Minion
} from "@/lib/types";
import { applyBattlecry, applySpell, createMinion } from "./effects";
import { useHeroPower } from "./heroPowers";
import { tryTriggerSecret } from "./secrets";

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
for (let i = arr.length - 1; i > 0; i--) {
const j = Math.floor(rng() * (i + 1));
[arr[i], arr[j]] = [arr[j], arr[i]];
}
}

function initPlayer(
id: 'A' | 'B',
deck: Deck,
goingFirst: boolean,
rng: () => number,
mulligan: { keepBelowCost: number } | null
): PlayerState {
const cards: CardData[] = [];
for (const dc of deck.cards) {
if (!dc.card) continue;
for (let i = 0; i < dc.count; i++) cards.push(dc.card);
}

shuffleInPlace(cards, rng);

const handSize = goingFirst ? 3 : 4;
const hand = cards.splice(0, handSize);

const player: PlayerState = {
id,
heroClass: deck.heroClass,
hp: 30,
armor: 0,
mana: 0,
maxMana: 0,
hand,
deck: cards,
board: [],
fatigue: 0,
heroPowerLevel: 0,
cardsPlayedThisTurn: 0,
heroPowerUsed: false,
secrets: []
};

if (mulligan) {
const toReturn: CardData[] = [];
const keep: CardData[] = [];
for (const c of player.hand) {
if ((c.cost ?? 0) <= mulligan.keepBelowCost) keep.push(c);
else toReturn.push(c);
}
player.hand = keep;
player.deck.push(...toReturn);
shuffleInPlace(player.deck, rng);
while (player.hand.length < handSize && player.deck.length > 0) {
player.hand.push(player.deck.shift()!);
}
}

return player;
}

function drawCard(p: PlayerState): void {
if (p.deck.length > 0) {
p.hand.push(p.deck.shift()!);
} else {
p.fatigue++;
p.hp -= p.fatigue;
}
}

/**

- Check if all player's minions can deal lethal to opponent this turn.
- Ignores taunts — used to skip trades when lethal exists.
*/
function boardCanLethal(player: PlayerState, opponent: PlayerState): boolean {
if (opponent.board.some((m) => m.taunt)) return false;
let total = 0;
for (const m of player.board) {
if (!m.canAttack) continue;
if (m.summonedThisTurn && !m.card.mechanics.includes("CHARGE")) continue;
const attacksLeft = (m.windfury ? 2 : 1) - m.attacksUsed;
total += m.attack * Math.max(0, attacksLeft);
}
return total >= opponent.hp + opponent.armor;
}

function playPhase(
player: PlayerState,
opponent: PlayerState,
registry: Map<number, CardData>,
rng: () => number,
log: LogEntry[],
turn: number
): void {
let safety = 20;
while (safety-- > 0) {
const affordable = player.hand
.filter((c) => (c.cost ?? 0) <= player.mana)
.filter((c) => c.type === 'MINION' || c.type === 'SPELL');
if (affordable.length === 0) break;

affordable.sort((a, b) => {
// Lethal spell first
if (a.type === 'SPELL') {
const eff = a.text?.match(/Deal (\d+) damage/i);
if (eff && parseInt(eff[1]) >= opponent.hp + opponent.armor) return -1000;
}
// AOE spell when opponent has 3+ minions
if (a.type === 'SPELL' && opponent.board.length >= 3) {
if (/damage to all|урона всем/i.test(a.text || "")) return -500;
}
// Prefer minions when board is empty
if (player.board.length === 0 && a.type === 'MINION' && b.type === 'SPELL') return -100;
return (b.cost ?? 0) - (a.cost ?? 0);
});

const card = affordable[0];
const idx = player.hand.indexOf(card);
if (idx < 0) break;
player.hand.splice(idx, 1);
player.mana -= card.cost ?? 0;

const comboActive = player.cardsPlayedThisTurn > 0;

if (card.type === 'MINION') {
let extraLog: string | null = null;
if (card.mechanics.includes('BATTLECRY') || card.text?.toLowerCase().includes('боевой клич') || card.text?.toLowerCase().includes('battlecry')) {
extraLog = applyBattlecry(card, player, opponent, registry, rng, comboActive);
}
const minion = createMinion(card);
player.board.push(minion);
log.push({
turn, player: player.id, action: 'play',
detail: `${card.name} (${card.cost} маны)${extraLog ? ' — ' + extraLog : ''}`,
hpA: player.id === 'A' ? player.hp : opponent.hp,
hpB: player.id === 'B' ? player.hp : opponent.hp,
boardA: player.id === 'A' ? player.board.length : opponent.board.length,
boardB: player.id === 'B' ? player.board.length : opponent.board.length
});

// Secret trigger: opponent might have "when minion played"
const secretResult = tryTriggerSecret(opponent, player, { type: 'MINION_PLAYED', minion });
if (secretResult) {
log.push({
turn, player: opponent.id, action: 'secret',
detail: `Тайна «${secretResult.secret.name}»: ${secretResult.detail}`,
hpA: opponent.id === 'A' ? opponent.hp : player.hp,
hpB: opponent.id === 'B' ? opponent.hp : player.hp,
boardA: opponent.id === 'A' ? opponent.board.length : player.board.length,
boardB: opponent.id === 'B' ? opponent.board.length : player.board.length
});
}
} else if (card.type === 'SPELL') {
const spellResult = applySpell(card, player, opponent, registry, rng, comboActive);
log.push({
turn, player: player.id, action: 'play',
detail: `${card.name} (заклинание, ${card.cost} маны)${spellResult.detail ? ' — ' + spellResult.detail : ''}`,
hpA: player.id === 'A' ? player.hp : opponent.hp,
hpB: player.id === 'B' ? player.hp : opponent.hp,
boardA: player.id === 'A' ? player.board.length : opponent.board.length,
boardB: player.id === 'B' ? player.board.length : opponent.board.length
});

// Secret trigger: opponent might have "when spell cast"
if (!spellResult.isSecret) {
const secretResult = tryTriggerSecret(opponent, player, { type: 'SPELL_CAST', card });
if (secretResult) {
log.push({
turn, player: opponent.id, action: 'secret',
detail: `Тайна «${secretResult.secret.name}»: ${secretResult.detail}`,
hpA: opponent.id === 'A' ? opponent.hp : player.hp,
hpB: opponent.id === 'B' ? opponent.hp : player.hp,
boardA: opponent.id === 'A' ? opponent.board.length : player.board.length,
boardB: opponent.id === 'B' ? opponent.board.length : player.board.length
});
}
}
}

player.cardsPlayedThisTurn++;

if (opponent.hp <= 0) return;
}
}

function attackPhase(
player: PlayerState,
opponent: PlayerState,
log: LogEntry[],
turn: number
): void {
const lethalAvailable = boardCanLethal(player, opponent);

for (const m of [...player.board]) {
if (!m.canAttack || m.attack <= 0) continue;
if (m.summonedThisTurn && !m.card.mechanics.includes('CHARGE')) continue;

const maxAttacks = m.windfury ? 2 : 1;
while (m.attacksUsed < maxAttacks) {
const taunts = opponent.board.filter((x) => x.taunt);
// If lethal available and no taunt, always face
const forcedFace = lethalAvailable && taunts.length === 0;

if (taunts.length > 0 && !forcedFace) {
const target = taunts[0];
if (m.divineShield) m.divineShield = false;
else m.health -= target.attack;
target.health -= m.attack;
if (target.health <= 0) {
const idx = opponent.board.indexOf(target);
if (idx >= 0) opponent.board.splice(idx, 1);
}
if (m.health <= 0) {
const idx = player.board.indexOf(m);
if (idx >= 0) player.board.splice(idx, 1);
break;
}
} else {
const worthTrading = !forcedFace && opponent.board.length > 0 &&
opponent.board.some((x) => x.attack >= m.attack && x.health <= m.attack);

if (worthTrading) {
// Trade with the highest-attack minion we can kill
const killable = opponent.board.filter((x) => x.health <= m.attack);
const target = killable.reduce((a, b) => (a.attack > b.attack ? a : b));
if (m.divineShield) m.divineShield = false;
else m.health -= target.attack;
target.health -= m.attack;
if (target.health <= 0) {
const idx = opponent.board.indexOf(target);
if (idx >= 0) opponent.board.splice(idx, 1);
}
if (m.health <= 0) {
const idx = player.board.indexOf(m);
if (idx >= 0) player.board.splice(idx, 1);
break;
}
} else {
// Go face
opponent.hp -= m.attack;
log.push({
turn, player: player.id, action: 'attack',
detail: `${m.card.name} атакует лицо на ${m.attack}`,
hpA: player.id === 'A' ? player.hp : opponent.hp,
hpB: player.id === 'B' ? player.hp : opponent.hp,
boardA: player.id === 'A' ? player.board.length : opponent.board.length,
boardB: player.id === 'B' ? player.board.length : opponent.board.length
});

// Secret: hero attacked
const secretResult = tryTriggerSecret(opponent, player, { type: 'HERO_ATTACKED', attacker: m });
if (secretResult) {
log.push({
turn, player: opponent.id, action: 'secret',
detail: `Тайна «${secretResult.secret.name}»: ${secretResult.detail}`,
hpA: opponent.id === 'A' ? opponent.hp : player.hp,
hpB: opponent.id === 'B' ? opponent.hp : player.hp,
boardA: opponent.id === 'A' ? opponent.board.length : player.board.length,
boardB: opponent.id === 'B' ? opponent.board.length : player.board.length
});
}
}
}

m.attacksUsed++;
if (opponent.hp <= 0) return;
}
}
}

export function classifyWinPath(deck: Deck, finalBlow: DamageSource, heroPowerLevel: number): WinPath {
let lowCost = 0, highCost = 0, spells = 0, total = 0, finishers = 0;
for (const dc of deck.cards) {
if (!dc.card) continue;
const c = dc.card.cost ?? 3;
if (c <= 2) lowCost += dc.count;
else if (c >= 6) highCost += dc.count;
if (dc.card.type === 'SPELL') spells += dc.count;
if (dc.card.mechanics.includes('REWIND') || c >= 7) finishers += dc.count;
total += dc.count;
}
const lowRatio = total > 0 ? lowCost / total : 0;
const highRatio = total > 0 ? highCost / total : 0;
const spellRatio = total > 0 ? spells / total : 0;

if (heroPowerLevel >= 3 && finishers > 0) return 'combo';
if (finalBlow === 'hero_power' && heroPowerLevel >= 3) return 'combo';
if (finalBlow === 'spell' && spellRatio > 0.3) return 'combo';
if (finalBlow === 'fatigue') return 'control';
if (finalBlow === 'minion' && lowRatio > 0.4) return 'aggro';
if (highRatio > 0.4) return 'control';
if (lowRatio > 0.3 && spellRatio > 0.3) return 'midrange';
return 'mixed';
}

export function simulateGame(
deckA: Deck,
deckB: Deck,
registry: Map<number, CardData>,
rng: () => number,
gameIndex: number,
options: SimOptions = {}
): GameResult {
const maxTurns = options.maxTurns ?? 30;
const mulligan = options.mulligan ?? null;

const aGoesFirst = gameIndex % 2 === 0;
const A = initPlayer('A', deckA, aGoesFirst, rng, mulligan);
const B = initPlayer('B', deckB, !aGoesFirst, rng, mulligan);

const players: Record<'A' | 'B', PlayerState> = { A, B };
const log: LogEntry[] = [];
let currentId: 'A' | 'B' = aGoesFirst ? 'A' : 'B';

for (let turn = 1; turn <= maxTurns; turn++) {
const current = players[currentId];
const opponent = players[currentId === 'A' ? 'B' : 'A'];

current.maxMana = Math.min(10, current.maxMana + 1);
current.mana = current.maxMana;
current.cardsPlayedThisTurn = 0;
current.heroPowerUsed = false;
drawCard(current);

for (const m of current.board) {
m.summonedThisTurn = false;
m.canAttack = true;
m.attacksUsed = 0;
}

playPhase(current, opponent, registry, rng, log, turn);
if (opponent.hp <= 0) {
return {
gameIndex, winner: currentId, turns: turn,
hpRemainingA: A.hp, hpRemainingB: B.hp,
winPathA: classifyWinPath(deckA, 'spell', A.heroPowerLevel),
winPathB: classifyWinPath(deckB, 'spell', B.heroPowerLevel),
finalBlowSource: 'spell',
log: log.slice(-15)
};
}

const hpLog = useHeroPower(current, opponent, rng);
if (hpLog) {
log.push({
turn, player: current.id, action: 'hero_power',
detail: hpLog,
hpA: current.id === 'A' ? current.hp : opponent.hp,
hpB: current.id === 'B' ? current.hp : opponent.hp,
boardA: current.id === 'A' ? current.board.length : opponent.board.length,
boardB: current.id === 'B' ? current.board.length : opponent.board.length
});
if (opponent.hp <= 0) {
return {
gameIndex, winner: currentId, turns: turn,
hpRemainingA: A.hp, hpRemainingB: B.hp,
winPathA: classifyWinPath(deckA, 'hero_power', A.heroPowerLevel),
winPathB: classifyWinPath(deckB, 'hero_power', B.heroPowerLevel),
finalBlowSource: 'hero_power',
log: log.slice(-15)
};
}
}

attackPhase(current, opponent, log, turn);
if (opponent.hp <= 0) {
return {
gameIndex, winner: currentId, turns: turn,
hpRemainingA: A.hp, hpRemainingB: B.hp,
winPathA: classifyWinPath(deckA, 'minion', A.heroPowerLevel),
winPathB: classifyWinPath(deckB, 'minion', B.heroPowerLevel),
finalBlowSource: 'minion',
log: log.slice(-15)
};
}

if (current.hp <= 0) {
const winner: Winner = currentId === 'A' ? 'B' : 'A';
return {
gameIndex, winner, turns: turn,
hpRemainingA: A.hp, hpRemainingB: B.hp,
winPathA: classifyWinPath(deckA, 'fatigue', A.heroPowerLevel),
winPathB: classifyWinPath(deckB, 'fatigue', B.heroPowerLevel),
finalBlowSource: 'fatigue',
log: log.slice(-15)
};
}

currentId = currentId === 'A' ? 'B' : 'A';
}

return {
gameIndex, winner: 'draw', turns: maxTurns,
hpRemainingA: A.hp, hpRemainingB: B.hp,
winPathA: 'mixed', winPathB: 'mixed',
finalBlowSource: 'fatigue',
log: log.slice(-15)
};
}