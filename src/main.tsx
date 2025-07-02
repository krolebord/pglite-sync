import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { DatabaseProvider } from "./db/context";

console.log("main");
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <DatabaseProvider>
        <App />
      </DatabaseProvider>
    </Suspense>
  </StrictMode>
);
