import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import {
  IdbFs,
  MemoryFS,
  PGlite,
  type PGliteInterface,
} from "@electric-sql/pglite";
import { live, type LiveNamespace } from "@electric-sql/pglite/live";
import {
  PGliteProvider as BasePGliteProvider,
  usePGlite as baseUsePGlite,
  useLiveQuery as baseUseLiveQuery,
} from "@electric-sql/pglite-react";
import { seedDatabase } from "./seed";
import { atom, useAtom } from "jotai";
import PgLiteWorker from "./worker?worker";
import { PGliteWorker as PgLiteWorkerWrapper } from "@electric-sql/pglite/worker";

type PGliteWithLive = PGlite & {
  live: LiveNamespace;
};

export type DatabaseContextType = {
  db: PGliteWithLive;
};

export interface DatabaseProviderProps {
  children: ReactNode;
}

const createWorkerDb = async () => {
  const pgLiteWorker = new PgLiteWorker();
  const pg = new PgLiteWorkerWrapper(pgLiteWorker);
  return pg;
};

const cloneWorkerDb = async (workerDb: PGliteInterface) => {
  console.time("cloneWorkerDb");
  const dump = await workerDb.dumpDataDir("none");
  console.timeEnd("cloneWorkerDb");

  console.time("createMemoryDb");
  const db = new PGlite({
    fs: new MemoryFS(),
    relaxedDurability: true,
    extensions: { live },
    loadDataDir: dump,
  });
  await db.waitReady;
  console.timeEnd("createMemoryDb");

  return db;
};

const initDb = async () => {
  console.time("initWorkerDb");
  const workerDb = await createWorkerDb();
  console.timeEnd("initWorkerDb");

  console.time("seedDatabase");
  await seedDatabase(workerDb);
  console.timeEnd("seedDatabase");

  const memoryDb = await cloneWorkerDb(workerDb);

  console.time("waitDbReady");
  await memoryDb.waitReady;
  console.timeEnd("waitDbReady");

  return { workerDb, memoryDb };
};

export const ctxAtom = atom(async () => {
  console.time("total initDb");
  const ctx = await initDb();
  await ctx.workerDb.waitReady;
  await ctx.memoryDb.waitReady;
  console.timeEnd("total initDb");
  return ctx;
});

const snapshotDbAtom = atom<PGlite | null>(null);

export const createSnapshotAtom = atom(null, async (get, set) => {});

export const restoreSnapshotAtom = atom(null, async (get, set) => {
  const ctx = await get(ctxAtom);

  const newMemoryDb = await cloneWorkerDb(ctx.workerDb);

  set(snapshotDbAtom, newMemoryDb);
});

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [ctx] = useAtom(ctxAtom);
  const [snapshotDb] = useAtom(snapshotDbAtom);

  return (
    <BasePGliteProvider db={(snapshotDb ?? ctx.memoryDb) as PGliteWithLive}>
      {children}
    </BasePGliteProvider>
  );
}

export function usePGlite(): PGliteWithLive {
  return baseUsePGlite() as PGliteWithLive;
}

export function useLiveQuery<T = any>(query: string, params?: any[]): T[] {
  const result = baseUseLiveQuery<T>(query, params);
  return result?.rows || [];
}
