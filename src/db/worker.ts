import { IdbFs, PGlite } from "@electric-sql/pglite";
import { worker } from "@electric-sql/pglite/worker";

worker({
  async init() {
    console.log("init worker");

    return new PGlite({
      fs: new IdbFs("db"),
      relaxedDurability: true,
    });
  },
});
