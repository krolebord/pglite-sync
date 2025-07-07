import { IdbFs, PGlite } from "@electric-sql/pglite";
import { worker } from "@electric-sql/pglite/worker";
import { OpfsAhpFS } from "@electric-sql/pglite/opfs-ahp";

const isSafari = !!(window as { safari?: unknown }).safari;
if (isSafari) {
  console.log("Safari detected. Using IndexedDB");
}

worker({
  async init() {
    console.log("init worker");

    return new PGlite({
      fs: isSafari ? new IdbFs("data/sync-db") : new OpfsAhpFS("data/sync-db"),
    });
  },
});
