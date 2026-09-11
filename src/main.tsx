import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import { App } from "./App";
import { BackgroundTuner } from "./tune/BackgroundTuner";
import "./styles.css";

declare const process: { env: { NODE_ENV?: string } };

const backgroundTunerEnabled =
  process.env.NODE_ENV !== "production" && location.search.includes("tune");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    {backgroundTunerEnabled ? <BackgroundTuner /> : null}
  </React.StrictMode>,
);
