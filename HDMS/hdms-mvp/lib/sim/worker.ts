/// <reference lib="webworker" />
import { runMatchupCodes } from "./runner";
import type { MatchupSummary, SimOptions } from "../types";

declare const self: DedicatedWorkerGlobalScope;

interface RunRequest {
type: "run";
requestId: string;
codeA: string;
codeB: string;
games: number;
seed: number;
options?: SimOptions;
}

interface DoneResponse {
type: "done";
requestId: string;
summary: MatchupSummary;
}

interface ErrorResponse {
type: "error";
requestId: string;
message: string;
}

self.addEventListener("message", async (event: MessageEvent<RunRequest>) => {
const req = event.data;
if (!req || req.type !== "run") return;

try {
const summary = await runMatchupCodes(
req.codeA,
req.codeB,
req.games,
req.seed,
req.options
);
const response: DoneResponse = {
type: "done",
requestId: req.requestId,
summary
};
self.postMessage(response);
} catch (err: unknown) {
const response: ErrorResponse = {
type: "error",
requestId: req.requestId,
message: err instanceof Error ? err.message : "Неизвестная ошибка"
};
self.postMessage(response);
}
});