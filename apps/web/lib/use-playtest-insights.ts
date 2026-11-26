"use client";

import { useEffect, useRef, useState } from "react";
import { campaignFromSearch, growthStatus, growthPost, type Attribution } from "./growth-api";

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
  const attribution = useRef<Attribution>({source:null,medium:null,campaign:null});
  const submission = useRef<object|null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const [notice,setNotice] = useState<{privacyUrl:string;noticeVersion:string}|null>(null);
  const canSubmit=!!notice;
  const [sendState,setSendState] = useState<"idle"|"sending"|"sent"|"error">("idle");
  useEffect(() => { attribution.current=campaignFromSearch(window.location.search); }, []);
  useEffect(() => {
    if(!enabled)return;
    let active=true;
    growthStatus().then(s=>{if(active&&s.reports&&s.privacyUrl&&s.noticeVersion)setNotice({privacyUrl:s.privacyUrl,noticeVersion:s.noticeVersion});}).catch(()=>{});
    return ()=>{active=false;};
  },[enabled]);
  const { key, mode, phase, drill } = sample;

  useEffect(() => {
    if (!enabled || !log.current) return;
    if (Core.observe(log.current, { key, mode, phase, drill })) setSummary(Core.summarize(log.current));
  }, [enabled, key, mode, phase, drill]);

  function changeEnabled(value: boolean) {
    generation.current++;
    submission.current=null;
    pending.current=false;
    setSendState("idle");
    setNotice(null);
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

  async function submitReport() {
    if(!enabled||!notice||!log.current||pending.current||sendState==="sent")return;
    const epoch=generation.current;
    try {
      submission.current ??= {action:"report",id:crypto.randomUUID(),report:Core.exportReport(log.current,ratings),attribution:attribution.current,noticeVersion:notice.noticeVersion};
      pending.current=true;
      setSendState("sending");
      await growthPost(submission.current);
      if(epoch===generation.current)setSendState("sent");
    } catch { if(epoch===generation.current)setSendState("error"); }
    finally { if(epoch===generation.current)pending.current=false; }
  }
  return { enabled, summary, ratings, setRatings, changeEnabled, download, canSubmit, privacyUrl:notice?.privacyUrl, sendState, submitReport };
}
