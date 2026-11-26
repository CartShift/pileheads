"use client";
import type { useGameFeedback } from "../lib/use-game-feedback";

export default function FeedbackSettings({feedback}: {feedback:ReturnType<typeof useGameFeedback>}) {
  return <>
    <label className="rule-toggle">
      <input type="checkbox" checked={feedback.soundEnabled} onChange={e=>feedback.changeSound(e.target.checked)} />
      <span><strong>Sound feedback</strong><small>Short original effects. Off until you opt in.</small></span>
    </label>
    <label className="motion-setting">
      <strong>Effects volume · {feedback.volume}%</strong>
      <input type="range" min={0} max={100} step={5} value={feedback.volume}
        aria-label="Effects volume" disabled={!feedback.soundEnabled}
        onChange={e=>feedback.changeVolume(Number(e.target.value))}/>
    </label>
    <label className="rule-toggle">
      <input type="checkbox" checked={feedback.haptics&&feedback.supported}
        disabled={!feedback.supported} onChange={e=>feedback.changeHaptics(e.target.checked)} />
      <span><strong>Haptic feedback</strong><small>{feedback.supported ?
        "Brief optional vibrations on your own actions." :
        "Vibration is not available in this browser."}</small></span>
    </label>
  </>;
}
