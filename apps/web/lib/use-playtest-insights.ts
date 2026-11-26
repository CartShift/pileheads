"use client";

import { useEffect, useRef, useState } from "react";

type Summary = { local: { started: number; completed: number }; online: { started: number; completed: number }; truncated: boolean };
type Sample = { key: string; mode: "home" | "local" | "online"; phase: string; drill: boolean };
type Ratings = { fun?: number; clarity?: number; wouldReplay?: string };
type Log = { rounds: Map<string, unknown>; truncated: boolean };
const Core = require("./playtest-insights-core.cjs") as {
  createLog: () => Log;
  observe: (log: Log, sample: Sample) => boolean;
  summarize: (log: Log) => Summary;
  exportReport: (log: Log, ratings: Ratings) => object;
};

export function usePlaytestInsights(sample: Sample) {
  const [enabled, setEnabled] = useState(false);
  const [summary, setSummary] = useState<Summary>(() => Core.summarize(Core.createLog()));
  const [ratings, setRatings] = useState<Ratings>({});
  const log = useRef<Log | null>(null);
  const { key, mode, phase, drill } = sample;

  useEffect(() => {
    if (!enabled || !log.current) return;
    if (Core.observe(log.current, { key, mode, phase, drill })) setSummary(Core.summarize(log.current));
  }, [enabled, key, mode, phase, drill]);

  function changeEnabled(value: boolean) {
    log.current = value ? Core.createLog() : null;
    setSummary(Core.summarize(log.current ?? Core.createLog()));
    setRatings({});
    setEnabled(value);
  }

  function download() {
    if (!enabled || !log.current) return;
    const report = Core.exportReport(log.current, ratings);
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pileheads-playtest.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { enabled, summary, ratings, setRatings, changeEnabled, download };
}
