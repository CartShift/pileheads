/**
 * Short original synthesized UI effects. No downloaded samples, external
 * audio services or copyrighted melodies. Starts only after a user gesture
 * enables sound; muted by default and harmless when Web Audio is unavailable.
 */
export type SoundEffect = "select" | "play" | "take" | "burn" | "snap" | "win";
let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch { return null; }
}
function tone(ctx: AudioContext, frequency: number, when: number, length: number,
  peak: number, destination?: number, shape: OscillatorType = "sine") {
  const oscillator = ctx.createOscillator(), gain = ctx.createGain();
  oscillator.type = shape;
  oscillator.frequency.setValueAtTime(frequency, when);
  if (destination) oscillator.frequency.exponentialRampToValueAtTime(destination, when + length);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + Math.min(0.012, length / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(when);
  oscillator.stop(when + length + 0.025);
}
export function playSound(effect: SoundEffect) {
  const ctx = context();
  if (!ctx) return;
  const start = ctx.currentTime + 0.004;
  switch (effect) {
    case "select": tone(ctx, 280, start, .055, .014, 170, "triangle"); break;
    case "play":
      tone(ctx, 210, start, .09, .025, 110, "triangle");
      tone(ctx, 430, start + .018, .06, .012, 260); break;
    case "take":
      tone(ctx, 315, start, .16, .021, 90, "triangle");
      tone(ctx, 160, start + .075, .1, .008, 75); break;
    case "burn":
      tone(ctx, 520, start, .24, .032, 82, "sawtooth");
      tone(ctx, 150, start + .1, .15, .015, 55, "triangle"); break;
    case "snap":
      tone(ctx, 740, start, .08, .027, 310, "square");
      tone(ctx, 1010, start + .035, .1, .016, 640); break;
    case "win":
      tone(ctx, 392, start, .15, .018);
      tone(ctx, 494, start + .12, .16, .018);
      tone(ctx, 587, start + .25, .35, .02); break;
  }
}
