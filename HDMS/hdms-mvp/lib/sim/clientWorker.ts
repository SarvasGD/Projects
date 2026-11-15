import type { MatchupSummary, SimOptions } from "../types";

interface DoneMessage {
type: "done";
requestId: string;
summary: MatchupSummary;
}

interface ErrorMessage {
type: "error";
requestId: string;
message: string;
}

/**

- Client-side wrapper around the simulation Web Worker.
- 
- Usage:
- const summary = await matchupWorker.run(codeA, codeB, 2000, options);
- 
- The worker loads the card registry itself (fetches HearthstoneJSON once,
- caches in worker context). First call in a session may take 5-15 sec.
*/
export class MatchupWorker {
private worker: Worker | null = null;
private seq = 0;
private initError: string | null = null;

private ensureWorker(): Worker {
if (this.initError) throw new Error(this.initError);
if (this.worker) return this.worker;

try {
this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
type: "module"
});
return this.worker;
} catch (err: unknown) {
this.initError =
err instanceof Error ? err.message : "Не удалось создать Web Worker";
throw new Error(this.initError);
}
}

run(
codeA: string,
codeB: string,
games: number,
options: SimOptions
): Promise<MatchupSummary> {
return new Promise((resolve, reject) => {
const worker = this.ensureWorker();
const requestId = `req-${this.seq++}-${Date.now()}`;

const handler = (e: MessageEvent<DoneMessage | ErrorMessage>) => {
const data = e.data;
if (data.requestId !== requestId) return;
worker.removeEventListener("message", handler);
if (data.type === "done") {
resolve(data.summary);
} else {
reject(new Error(data.message));
}
};

worker.addEventListener("message", handler);

worker.postMessage({
type: "run",
requestId,
codeA,
codeB,
games,
seed: Date.now() + Math.floor(Math.random() * 100000),
options
});
});
}

terminate() {
if (this.worker) {
this.worker.terminate();
this.worker = null;
}
}
}

export const matchupWorker = new MatchupWorker();