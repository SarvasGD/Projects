import { loadCardRegistry } from "../cards/registry";
import { decodeDeckCode } from "../deck/decode";
import { simulateMatchup } from "./matchup";
import type { MatchupSummary, SimOptions } from "../types";

/**

- Shared runner — used by both the server API route and the Web Worker.
- Loads registry, decodes both deck codes, runs Monte Carlo simulation.
*/
export async function runMatchupCodes(
codeA: string,
codeB: string,
games: number,
seed: number,
options?: SimOptions
): Promise<MatchupSummary> {
const registry = await loadCardRegistry();
const deckA = await decodeDeckCode(codeA);
const deckB = await decodeDeckCode(codeB);
return simulateMatchup(deckA, deckB, registry, games, seed, options);
}