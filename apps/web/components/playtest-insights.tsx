"use client";

import type { usePlaytestInsights } from "../lib/use-playtest-insights";

export default function PlaytestInsights({ insights }: { insights: ReturnType<typeof usePlaytestInsights> }) {
  const { enabled, summary, ratings, setRatings, changeEnabled, download } = insights;
  return (
    <section aria-label="Voluntary playtest report">
      <label className="rule-toggle">
        <input type="checkbox" checked={enabled} onChange={event => changeEnabled(event.target.checked)} />
        <span><strong>Help improve PILEHEADS</strong><small>Optional playtest report. Counts rounds observed from setup in this tab only. Nothing is uploaded or saved in browser storage. Turn off to clear. Refreshing also clears the report.</small></span>
      </label>
      {enabled && <>
        <p>Local: {summary.local.completed} of {summary.local.started} started rounds completed. Online: {summary.online.completed} of {summary.online.started} started rounds completed.</p>
        {summary.truncated && <p>Report limit reached. Later rounds may be missing.</p>}
        <label className="motion-setting"><strong>How fun was the game?</strong>
          <select value={ratings.fun ?? ""} onChange={event => setRatings(previous => ({ ...previous, fun: Number(event.target.value) || undefined }))}>
            <option value="">Not rated</option>{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="motion-setting"><strong>How clear were the rules?</strong>
          <select value={ratings.clarity ?? ""} onChange={event => setRatings(previous => ({ ...previous, clarity: Number(event.target.value) || undefined }))}>
            <option value="">Not rated</option>{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="motion-setting"><strong>Would you play again?</strong>
          <select value={ratings.wouldReplay ?? ""} onChange={event => setRatings(previous => ({ ...previous, wouldReplay: event.target.value }))}>
            <option value="">Not answered</option><option value="yes">Yes</option><option value="no">No</option><option value="unsure">Not sure</option>
          </select>
        </label>
        <button type="button" className="secondary-button" onClick={download}>Download playtest report</button>
        <p className="settings-hint">Share the downloaded file with the organizer only if you choose. Do not include personal information.</p>
      </>}
    </section>
  );
}
