import type { ActiveSecret, CardData, Minion, PlayerState } from "@/lib/types";

export type SecretEvent =
| { type: 'HERO_ATTACKED'; attacker: Minion }
| { type: 'MINION_PLAYED'; minion: Minion }
| { type: 'SPELL_CAST'; card: CardData }
| { type: 'MINION_DIED'; minion: Minion };

/**

- Determine whether a secret's text matches an event.
- Uses regex on Russian/English text plus mechanic hints.
- Conservative: only matches clearly-recognizable secrets.
*/
export function matchesSecret(card: CardData, event: SecretEvent): boolean {
if (!card.mechanics.includes("SECRET")) return false;
const text = (card.text || "").toLowerCase();

const mentionsHeroAttack =
/hero.*attack|attack.*hero|герой.*атак|атак.*герой/i.test(text);
const mentionsMinionPlay =
/play.*minion|summon.*minion|существо.*играет|играет.*существо/i.test(text);
const mentionsSpellCast =
/cast.*spell|spell.*cast|заклинание.*примен|примен.*заклинание|контрзаклинание|counter/i.test(text);
const mentionsMinionDeath =
/minion.*dies|dies.*minion|существо.*погиба|погиба.*существо/i.test(text);

switch (event.type) {
case 'HERO_ATTACKED':
return mentionsHeroAttack;
case 'MINION_PLAYED':
return mentionsMinionPlay;
case 'SPELL_CAST':
return mentionsSpellCast;
case 'MINION_DIED':
return mentionsMinionDeath;
default:
return false;
}
}

interface SecretEffect {
damage?: number;
destroy?: boolean;
armor?: number;
heal?: number;
counter?: boolean;
summon?: { attack: number; health: number };
}

function parseSecretEffect(card: CardData): SecretEffect {
const text = card.text || "";
const result: SecretEffect = {};

const dmg = text.match(/Deal (\d+) damage|Наносит (\d+) ед. урона|Нанесите (\d+) ед. урона/i);
if (dmg) result.damage = parseInt(dmg[1] ?? dmg[2] ?? dmg[3]);

if (/[Dd]estroy|Уничтожьте|Уничтожить/i.test(text)) result.destroy = true;
if (/[Cc]ounter|Контрзаклинание|Отмените/i.test(text)) result.counter = true;

const armor = text.match(/Gain (\d+) Armor|Получите (\d+) ед. брони/i);
if (armor) result.armor = parseInt(armor[1] ?? armor[2]);

const heal = text.match(/Restore (\d+) Health|Восстановите (\d+) ед. здоровья/i);
if (heal) result.heal = parseInt(heal[1] ?? heal[2]);

const summon = text.match(/Summon a (\d+)\/(\d+)|Призовите существо (\d+)\/(\d+)/i);
if (summon) result.summon = { attack: parseInt(summon[1] ?? summon[3]), health: parseInt(summon[2] ?? summon[4]) };

return result;
}

function applySecretEffect(
card: CardData,
owner: PlayerState,
opponent: PlayerState,
event: SecretEvent
): string {
const eff = parseSecretEffect(card);
const parts: string[] = [];

if (eff.counter && event.type === 'SPELL_CAST') {
parts.push("заклинание отменено");
}
if (eff.destroy) {
if (event.type === 'MINION_PLAYED' || event.type === 'HERO_ATTACKED') {
const target = event.type === 'MINION_PLAYED' ? event.minion : event.attacker;
const idx = opponent.board.indexOf(target);
if (idx >= 0) opponent.board.splice(idx, 1);
parts.push("существо уничтожено");
}
}
if (eff.damage) {
if (event.type === 'MINION_PLAYED' || event.type === 'HERO_ATTACKED') {
const target = event.type === 'MINION_PLAYED' ? event.minion : event.attacker;
target.health -= eff.damage;
if (target.health <= 0) {
const idx = opponent.board.indexOf(target);
if (idx >= 0) opponent.board.splice(idx, 1);
}
parts.push(`${eff.damage} урона существу`);
} else if (event.type === 'HERO_ATTACKED') {
opponent.hp -= eff.damage;
parts.push(`${eff.damage} урона герою`);
}
}
if (eff.armor) {
owner.armor += eff.armor;
parts.push(`+${eff.armor} брони`);
}
if (eff.heal) {
owner.hp = Math.min(30, owner.hp + eff.heal);
parts.push(`+${eff.heal} HP`);
}
if (eff.summon) {
owner.board.push({
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
parts.push("призван миньон");
}

return parts.length > 0 ? parts.join(", ") : "сработал";
}

/**

- Try to trigger the first matching secret for `owner`.
- If a secret triggers, it's removed and a log string returned.
- Returns null if no secret matched.
*/
export function tryTriggerSecret(
owner: PlayerState,
opponent: PlayerState,
event: SecretEvent
): { secret: CardData; detail: string } | null {
for (let i = 0; i < owner.secrets.length; i++) {
const s = owner.secrets[i];
if (matchesSecret(s.card, event)) {
const detail = applySecretEffect(s.card, owner, opponent, event);
owner.secrets.splice(i, 1);
return { secret: s.card, detail };
}
}
return null;
}

/**

- Check if a card is a secret that should be stored rather than applied.
*/
export function isSecretCard(card: CardData): boolean {
return card.mechanics.includes("SECRET") && card.type === "SPELL";
}

export function addSecret(player: PlayerState, card: CardData): ActiveSecret {
const secret: ActiveSecret = { card };
player.secrets.push(secret);
return secret;
}