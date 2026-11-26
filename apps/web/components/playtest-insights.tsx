"use client";

import type { usePlaytestInsights } from "../lib/use-playtest-insights";

export default function PlaytestInsights({ insights }: { insights: ReturnType<typeof usePlaytestInsights> }) {
  const { enabled, summary, ratings, setRatings, changeEnabled, download, canSubmit, privacyUrl, sendState, submitReport } = insights;
  return (
    <section aria-label="Voluntary playtest report">
      <label className="rule-toggle">
        <input type="checkbox" checked={enabled} onChange={event => changeEnabled(event.target.checked)} />
        <span><strong>Help improve PILEHEADS</strong><small>Optional playtest report. Counts rounds observed from setup in this tab only. Nothing is uploaded automatically or saved in browser storage. Turn off or refresh to clear the local report.</small></span>
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
        {canSubmit && <><p className="settings-hint">You can explicitly send one snapshot of these counts, ratings and recognized campaign categories to the operator. No names or room codes are included. Clearing the local report does not remove a submitted snapshot. <a href={privacyUrl} target="_blank" rel="noreferrer">Read the privacy notice.</a></p><button type="button" className="secondary-button" disabled={sendState==="sending"||sendState==="sent"} onClick={()=>void submitReport()}>{sendState==="sending"?"Sending…":sendState==="sent"?"Report sent":sendState==="error"?"Retry same report":"Send report voluntarily"}</button><p role="status">{sendState==="sent"?"Thank you for sharing your feedback.":sendState==="error"?"Could not confirm submission. Retry sends the same snapshot.":""}</p></>}
      </>}
    </section>
  );
}
