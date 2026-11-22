import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { App } from "./App";
import { ToastProvider } from "./lib/toast";

// The toast provider wraps the app rather than sitting inside it, because it is
// also what renders the error messages that would otherwise appear when the
// app itself fails to load its settings.
const container = document.getElementById("root");
if (!container) {
  throw new Error("index.html has no #root element");
}

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
