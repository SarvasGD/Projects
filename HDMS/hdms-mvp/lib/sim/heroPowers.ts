import type { PlayerState } from "@/lib/types";

/**

- Attempt to use hero power. Returns log message if successful, null if not.
- Costs 2 mana. Only one use per turn.
- 
- Rogue model:
- - Level 0 (no Imbue): Dagger (1 damage to face)
- - Level N (Imbued): (N+1) damage to random enemy (minion if 65% chance, else face)
*/
export function useHeroPower(
player: PlayerState,
opponent: PlayerState,
rng: () => number
): string | null {
if (player.heroPowerUsed) return null;
if (player.mana < 2) return null;

player.mana -= 2;
player.heroPowerUsed = true;

if (player.heroClass === "ROGUE") {
if (player.heroPowerLevel === 0) {
opponent.hp -= 1;
return "Сила героя (Кинжал): 1 урон в лицо";
}
const dmg = Math.min(10, player.heroPowerLevel + 1);
if (opponent.board.length > 0 && rng() < 0.65) {
const target = opponent.board[Math.floor(rng() * opponent.board.length)];
target.health -= dmg;
if (target.health <= 0) {
const idx = opponent.board.indexOf(target);
if (idx >= 0) opponent.board.splice(idx, 1);
}
return `Сила героя (Зарядка ${player.heroPowerLevel}): ${dmg} урона существу`;
}
opponent.hp -= dmg;
return `Сила героя (Зарядка ${player.heroPowerLevel}): ${dmg} урона в лицо`;
}

// Default: 1 damage to face
opponent.hp -= 1;
return "Сила героя: 1 урон в лицо";
}