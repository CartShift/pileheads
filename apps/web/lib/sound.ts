/**
 * Short original synthesized UI effects. No downloaded samples, external
 * audio services or copyrighted melodies. Starts only after a user gesture
 * enables sound; muted by default and harmless when Web Audio is unavailable.
 */
export type SoundEffect = "select" | "play" | "take" | "burn" | "snap" | "win" | "slam" | "dump" | "reset" | "ghost" | "under" | "skip";
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
const brandedSounds: Partial<Record<SoundEffect, string>> = {
  play: "play", burn: "burn", snap: "snap", dump: "dump", reset: "reset",
  ghost: "ghost", under: "under", skip: "skip", win: "victory"
};
const cuePlayers = new Map<string, HTMLAudioElement>();
const failedCues = new Set<string>();
function playBranded(effect: SoundEffect): boolean {
  const name = brandedSounds[effect];
  if (!name || typeof Audio === "undefined" || failedCues.has(name)) return false;
  try {
    let audio = cuePlayers.get(name);
    if (!audio) {
      audio = new Audio("/pilehead/assets/sound-v2/" + name + ".mp3");
      audio.preload = "auto";
      audio.volume = 0.45;
      if (!audio.canPlayType("audio/mpeg")) return false;
      cuePlayers.set(name, audio);
    }
    audio.currentTime = 0;
    void audio.play().catch(() => { failedCues.add(name); });
    return true;
  } catch { failedCues.add(name); return false; }
}
export function playSound(effect: SoundEffect) {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  if (playBranded(effect)) return;
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
    case "slam":
      tone(ctx, 180, start, .12, .027, 75, "triangle");
      tone(ctx, 620, start + .024, .12, .014, 205, "square"); break;
    case "dump":
      tone(ctx, 420, start, .12, .015, 220, "triangle");
      tone(ctx, 250, start + .085, .14, .012, 105); break;
    case "reset":
      tone(ctx, 360, start, .11, .012, 510, "sine"); break;
    case "ghost":
      tone(ctx, 480, start, .14, .008, 250, "sine"); break;
    case "under":
      tone(ctx, 290, start, .12, .014, 210, "triangle"); break;
    case "skip":
      tone(ctx, 510, start, .07, .011, 680); break;
    case "win":
      tone(ctx, 392, start, .15, .018);
      tone(ctx, 494, start + .12, .16, .018);
      tone(ctx, 587, start + .25, .35, .02); break;
  }
}
