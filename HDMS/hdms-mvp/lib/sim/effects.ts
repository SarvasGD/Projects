import type { CardData, Minion, PlayerState } from "@/lib/types";
import { hasRandomGeneration, resolveDiscover } from "./randomCards";
import { isSecretCard, addSecret } from "./secrets";

export interface ParsedEffect {
damageFace?: number;
damageMinion?: number;
damageAll?: number;
heal?: number;
draw?: number;
armor?: number;
destroy?: boolean;
buff?: { attack: number; health: number };
summon?: { attack: number; health: number };
freeze?: boolean;
silence?: boolean;
imbue?: boolean;
dealTwice?: boolean;
transformTo?: { attack: number; health: number };
copyFromOpponentHand?: boolean;
}

export function parseEffect(card: CardData): ParsedEffect {
const text = card.text || "";
const result: ParsedEffect = {};

const dmgMinion = text.match(/Deal (\d+) damage to a minion/i)
|| text.match(/Наносит (\d+) ед. урона существу/i);
if (dmgMinion) result.damageMinion = parseInt(dmgMinion[1] ?? dmgMinion[2]);

const dmgAll = text.match(/Deal (\d+) damage to all/i)
|| text.match(/Наносит (\d+) ед. урона всем/i);
if (dmgAll) result.damageAll = parseInt(dmgAll[1] ?? dmgAll[2]);

if (result.damageMinion === undefined && result.damageAll === undefined) {
const dmg = text.match(/Deal (\d+) damage/i)
|| text.match(/Наносит (\d+) ед. урона/i)
|| text.match(/Нанесите (\d+) ед. урона/i);
if (dmg) result.damageFace = parseInt(dmg[1] ?? dmg[2] ?? dmg[3]);
}

const heal = text.match(/Restore (\d+) Health/i)
|| text.match(/Восстанавливает (\d+) ед. здоровья/i)
|| text.match(/Восстановите (\d+) ед. здоровья/i);
if (heal) result.heal = parseInt(heal[1] ?? heal[2] ?? heal[3]);

const draw = text.match(/Draw (\d+) cards?/i)
|| text.match(/Доберите (\d+) карт/i);
if (draw) result.draw = parseInt(draw[1] ?? draw[2]);

const armor = text.match(/Gain (\d+) Armor/i)
|| text.match(/Получите (\d+) ед. брони/i);
if (armor) result.armor = parseInt(armor[1] ?? armor[2]);

if (/[Dd]estroy a minion|Уничтожьте существо|Уничтожить существо/i.test(text)) {
result.destroy = true;
}

const buff = text.match(/Give a minion\s+\+(\d+)\/\+(\d+)/i)
|| text.match(/Даёт существу\s+\+(\d+)\/\+(\d+)/i)
|| text.match(/Дайте существу\s+\+(\d+)\/\+(\d+)/i);
if (buff) result.buff = { attack: parseInt(buff[1]), health: parseInt(buff[2]) };

const summon = text.match(/Summon a (\d+)\/(\d+)/i)
|| text.match(/Призывает существо (\d+)\/(\d+)/i)
|| text.match(/Призовите существо (\d+)\/(\d+)/i);
if (summon) result.summon = { attack: parseInt(summon[1] ?? summon[3]), health: parseInt(summon[2] ?? summon[4]) };

if (/[Ff]reeze|Заморозить|Заморозьте/i.test(text)) result.freeze = true;
if (/[Ss]ilence|Немота|Наденьте немоту/i.test(text)) result.silence = true;

if (/[Ii]mbue|Усиливает силу героя|Усильте силу героя|Усилить силу героя/i.test(text)) {
result.imbue = true;
}

if (/\btwice\b|дважды/i.test(text)) result.dealTwice = true;

const transform = text.match(/[Tt]ransform.*?into a (\d+)\/(\d+)/i)
|| text.match(/[Пп]ревращает.*?в (\d+)\/(\d+)/i)
|| text.match(/[Пп]ревратите.*?в (\d+)\/(\d+)/i);
if (transform) {
result.transformTo = { attack: parseInt(transform[1]), health: parseInt(transform[2]) };
}

if (/[Cc]opy a card from your opponent'?s hand|Скопируйте карту из руки противника/i.test(text)) {
result.copyFromOpponentHand = true;
}

return result;
}

function removeDeadMinions(player: PlayerState): void {
player.board = player.board.filter((m) => m.health > 0);
}

function pickBiggestTarget(opponent: PlayerState): Minion | null {
if (opponent.board.length === 0) return null;
return opponent.board.reduce((a, b) => (a.attack * a.health > b.attack * b.health ? a : b));
}

function applyParsedEffect(
eff: ParsedEffect,
player: PlayerState,
opponent: PlayerState,
card: CardData,
rng: () => number
): void {
if (eff.imbue) {
player.heroPowerLevel = Math.min(10, player.heroPowerLevel + 1);
}

if (eff.damageAll) {
for (const m of opponent.board) m.health -= eff.damageAll;
removeDeadMinions(opponent);
opponent.hp -= eff.damageAll;
}

if (eff.damageFace) {
let dmg = eff.damageFace;
if (eff.dealTwice) dmg *= 2;
opponent.hp -= dmg;
}

if (eff.damageMinion) {
const target = pickBiggestTarget(opponent);
if (target) {
target.health -= eff.damageMinion;
removeDeadMinions(opponent);
}
}

if (eff.destroy) {
const target = pickBiggestTarget(opponent);
if (target) {
const idx = opponent.board.indexOf(target);
if (idx >= 0) opponent.board.splice(idx, 1);
}
}

if (eff.transformTo) {
const target = pickBiggestTarget(opponent);
if (target) {
target.attack = eff.transformTo.attack;
target.health = eff.transformTo.health;
target.maxHealth = eff.transformTo.health;
target.taunt = false;
target.divineShield = false;
target.windfury = false;
target.lifesteal = false;
}
}

if (eff.copyFromOpponentHand && opponent.hand.length > 0) {
const idx = Math.floor(rng() * opponent.hand.length);
const copied = opponent.hand[idx];
player.hand.push(copied);
}

if (eff.buff && player.board.length > 0) {
const target = player.board[0];
target.attack += eff.buff.attack;
target.health += eff.buff.health;
target.maxHealth += eff.buff.health;
}

if (eff.summon) {
player.board.push({
card: { ...card, attack: eff.summon.attack, health: eff.summon.health },
attack: eff.summon.attack,
health: eff.summon.health,
maxHealth: eff.summon.health,
canAttack: false,
summonedThisTurn: true,
taunt: false,
divineShield: false,
windfury: false,
attacksUsed: 0,
lifesteal: false
});
}

if (eff.heal) player.hp = Math.min(30, player.hp + eff.heal);
if (eff.armor) player.armor += eff.armor;
if (eff.draw) {
for (let i = 0; i < eff.draw && player.deck.length > 0; i++) {
player.hand.push(player.deck.shift()!);
}
}

if (eff.freeze) {
for (const m of opponent.board) m.canAttack = false;
}

if (eff.silence && opponent.board.length > 0) {
const target = pickBiggestTarget(opponent);
if (target) {
target.taunt = false;
target.divineShield = false;
target.windfury = false;
target.lifesteal = false;
}
}
}

const MANUAL_HANDLERS: Array<{
pattern: RegExp;
apply: (player: PlayerState, opponent: PlayerState, rng: () => number) => string;
}> = [
{
pattern: /Морхи|Morchie/i,
apply: (player, opponent, rng) => {
const dmg = 3;
if (opponent.board.length > 0) {
const target = opponent.board[Math.floor(rng() * opponent.board.length)];
target.health -= dmg;
removeDeadMinions(opponent);
} else {
opponent.hp -= dmg;
}
return "Морхи: 3 урона";
}
},
{
pattern: /Разрушитель Перекр[её]стка|Crossroads/i,
apply: (player, opponent, rng) => {
const dmg = 7;
if (opponent.board.length > 0) {
const target = opponent.board[Math.floor(rng() * opponent.board.length)];
target.health -= dmg;
removeDeadMinions(opponent);
} else {
opponent.hp -= dmg;
}
return "Разрушитель Перекрёстка: 7 урона";
}
},
{
pattern: /^(?:МАТРИАРХ(?:\s*[|∣]\^?MATRIARCH)?|[|∣]?\^?MATRIARCH)$/i,
apply: (player) => {
for (let i = 0; i < 2 && player.deck.length > 0; i++) {
player.hand.push(player.deck.shift()!);
}
return "МАТРИАРХ: добор 2";
}
},
{
pattern: /Темночешуйчатая праматерь|Darkrider Matriarch|Dark.*Matriarch/i,
apply: (player) => {
const hasDragon = player.hand.some((c) => c.race === "DRAGON");
if (hasDragon) {
player.mana = Math.min(player.maxMana, player.mana + 2);
return "+2 маны";
}
return "нет дракона";
}
}
];

function runManualHandlers(
card: CardData,
player: PlayerState,
opponent: PlayerState,
rng: () => number
): string | null {
for (const handler of MANUAL_HANDLERS) {
if (handler.pattern.test(card.name)) {
return handler.apply(player, opponent, rng);
}
}
return null;
}

export function applyBattlecry(
card: CardData,
player: PlayerState,
opponent: PlayerState,
registry: Map<number, CardData>,
rng: () => number,
comboActive: boolean = false
): string | null {
const manualLog = runManualHandlers(card, player, opponent, rng);
if (manualLog) return manualLog;

const eff = parseEffect(card);
applyParsedEffect(eff, player, opponent, card, rng);

if (comboActive && card.mechanics.includes("COMBO")) {
if (eff.damageFace) opponent.hp -= eff.damageFace;
if (eff.damageMinion) {
const target = pickBiggestTarget(opponent);
if (target) {
target.health -= eff.damageMinion;
removeDeadMinions(opponent);
}
}
if (eff.draw) {
for (let i = 0; i < eff.draw && player.deck.length > 0; i++) {
player.hand.push(player.deck.shift()!);
}
}
}

if (hasRandomGeneration(card)) {
const discovered = resolveDiscover(card, registry, rng);
if (discovered) player.hand.push(discovered);
}

return null;
}

export function applySpell(
card: CardData,
player: PlayerState,
opponent: PlayerState,
registry: Map<number, CardData>,
rng: () => number,
comboActive: boolean = false
): { detail: string | null; isSecret: boolean } {
if (isSecretCard(card)) {
addSecret(player, card);
return { detail: `тайна активирована: ${card.name}`, isSecret: true };
}

const manualLog = runManualHandlers(card, player, opponent, rng);
if (manualLog) return { detail: manualLog, isSecret: false };

const eff = parseEffect(card);
applyParsedEffect(eff, player, opponent, card, rng);

if (comboActive && card.mechanics.includes("COMBO")) {
if (eff.damageFace) opponent.hp -= eff.damageFace;
if (eff.damageMinion) {
const target = pickBiggestTarget(opponent);
if (target) {
target.health -= eff.damageMinion;
removeDeadMinions(opponent);
}
}
if (eff.draw) {
for (let i = 0; i < eff.draw && player.deck.length > 0; i++) {
player.hand.push(player.deck.shift()!);
}
}
}

if (hasRandomGeneration(card) && !eff.damageFace && !eff.damageAll) {
const discovered = resolveDiscover(card, registry, rng);
if (discovered) player.hand.push(discovered);
}

return { detail: null, isSecret: false };
}

export function createMinion(card: CardData): Minion {
const mech = card.mechanics ?? [];
return {
card,
attack: card.attack ?? 0,
health: card.health ?? 1,
maxHealth: card.health ?? 1,
canAttack: mech.includes("CHARGE"),
summonedThisTurn: true,
taunt: mech.includes("TAUNT"),
divineShield: mech.includes("DIVINE_SHIELD"),
windfury: mech.includes("WINDFURY"),
attacksUsed: 0,
lifesteal: mech.includes("LIFESTEAL")
};
}