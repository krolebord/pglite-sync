import { PGliteWorker } from "@electric-sql/pglite/worker";
import { measureTime } from "./utils";
import { seedDatabase } from "../db/seed";
import { MemoryFS, PGlite, type PGliteInterface } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";

type InitDbOptions = {
  worker: Worker;
};

export async function initDb(options: InitDbOptions) {
  const { worker } = options;

  const syncDb = new PGliteWorker(worker);

  await measureTime("sync-db-ready", () => syncDb.waitReady);

  await measureTime("seed-db", () => seedDatabase(syncDb));

  const optimisticDb = await cloneNewOptimisticDb(syncDb);

  await measureTime("optimistic-db-ready", () => optimisticDb.waitReady);

  return { syncDb, optimisticDb };
}

async function cloneNewOptimisticDb(workerDb: PGliteInterface) {
  const dump = await measureTime("dump-db", () => workerDb.dumpDataDir("none"));

  const optimisticDb = await measureTime(
    "create-optimistic-db",
    () =>
      new PGlite({
        fs: new MemoryFS(),
        relaxedDurability: true,
        extensions: { live },
        loadDataDir: dump,
      })
  );

  return optimisticDb;
}
