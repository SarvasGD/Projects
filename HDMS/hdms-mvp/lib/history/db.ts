import { openDB, type IDBPDatabase } from "idb";
import type { TestRecord, MatrixRecord } from "./types";

const DB_NAME = "hdms-history";
const DB_VERSION = 1;
const TESTS_STORE = "tests";
const MATRIX_STORE = "matrix";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
if (typeof window === "undefined") {
throw new Error("IndexedDB доступен только в браузере");
}
if (!dbPromise) {
dbPromise = openDB(DB_NAME, DB_VERSION, {
upgrade(db) {
if (!db.objectStoreNames.contains(TESTS_STORE)) {
const store = db.createObjectStore(TESTS_STORE, { keyPath: "id" });
store.createIndex("timestamp", "timestamp");
}
if (!db.objectStoreNames.contains(MATRIX_STORE)) {
const store = db.createObjectStore(MATRIX_STORE, { keyPath: "id" });
store.createIndex("timestamp", "timestamp");
}
}
});
}
return dbPromise;
}

export async function saveTest(record: TestRecord): Promise<void> {
const db = await getDB();
await db.put(TESTS_STORE, record);
}

export async function getTests(limit = 100): Promise<TestRecord[]> {
const db = await getDB();
const all: TestRecord[] = await db.getAll(TESTS_STORE);
return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function getTest(id: string): Promise<TestRecord | null> {
const db = await getDB();
const rec = await db.get(TESTS_STORE, id);
return rec ?? null;
}

export async function deleteTest(id: string): Promise<void> {
const db = await getDB();
await db.delete(TESTS_STORE, id);
}

export async function clearTests(): Promise<void> {
const db = await getDB();
await db.clear(TESTS_STORE);
}

export async function saveMatrix(record: MatrixRecord): Promise<void> {
const db = await getDB();
await db.put(MATRIX_STORE, record);
}

export async function getMatrices(limit = 50): Promise<MatrixRecord[]> {
const db = await getDB();
const all: MatrixRecord[] = await db.getAll(MATRIX_STORE);
return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function deleteMatrix(id: string): Promise<void> {
const db = await getDB();
await db.delete(MATRIX_STORE, id);
}

export async function clearMatrices(): Promise<void> {
const db = await getDB();
await db.clear(MATRIX_STORE);
}

export function makeTestId(): string {
return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeMatrixId(): string {
return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}