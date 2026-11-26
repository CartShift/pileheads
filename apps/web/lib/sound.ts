/**
 * Short original synthesized UI effects. No downloaded samples, external
 * audio services or copyrighted melodies. Starts only after a user gesture
 * enables sound; muted by default and harmless when Web Audio is unavailable.
 */
export type SoundEffect = "select" | "play" | "take" | "burn" | "snap" | "win" | "slam" | "dump" | "reset" | "ghost" | "under" | "skip" | "counter" | "reject" | "loss" | "deal";
let audioContext: AudioContext | null = null;
let volume = .7;
let generation = 0;
let activeAudio: HTMLAudioElement | null = null;
let activeBus: GainNode | null = null;

export function stopSound() {
  generation++;
  if (activeAudio) { activeAudio.pause(); activeAudio = null; }
  if (activeBus) { activeBus.disconnect(); activeBus = null; }
}
export function setSoundVolume(percent: number) {
  volume = Math.max(0, Math.min(1, percent / 100));
  if (activeAudio) activeAudio.volume = .65 * volume;
  if (activeBus) activeBus.gain.value = volume;
  if (volume === 0) stopSound();
}
export function unlockSound() { context(); }


function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume().catch(() => {});
    return audioContext;
  } catch { return null; }
}
function tone(ctx: AudioContext, bus: GainNode, frequency: number, when: number, length: number,
  peak: number, destination?: number, shape: OscillatorType = "sine") {
  const oscillator = ctx.createOscillator(), gain = ctx.createGain();
  oscillator.type = shape;
  oscillator.frequency.setValueAtTime(frequency, when);
  if (destination) oscillator.frequency.exponentialRampToValueAtTime(destination, when + length);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + Math.min(0.012, length / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  oscillator.connect(gain).connect(bus);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(when);
  oscillator.stop(when + length + 0.025);
}
const brandedSounds: Partial<Record<SoundEffect, string>> = {
  play: "play", burn: "burn", snap: "snap", dump: "dump", reset: "reset",
  ghost: "ghost", under: "under", skip: "skip", win: "victory"
};
const cuePlayers = new Map<string, HTMLAudioElement>();
const failedCues = new Set<string>();
function playBranded(effect: SoundEffect, ticket: number): boolean {
  const name = brandedSounds[effect];
  if (!name || typeof Audio === "undefined" || failedCues.has(name)) return false;
  try {
    let audio = cuePlayers.get(name);
    if (!audio) {
      audio = new Audio("/pilehead/assets/sound-v2/" + name + ".mp3");
      audio.preload = "auto";
      if (!audio.canPlayType("audio/mpeg")) return false;
      cuePlayers.set(name, audio);
    }
    activeAudio = audio;
    audio.volume = .65 * volume;
    audio.currentTime = 0;
    void audio.play().catch(error => {
      // Autoplay is recoverable on the next gesture. Do not blacklist it.
      if (error?.name === "NotSupportedError") failedCues.add(name);
      if (generation !== ticket || document.visibilityState === "hidden") return;
      activeAudio = null;
      synthesize(effect);
    });
    return true;
  } catch { failedCues.add(name); return false; }
}
export function playSound(effect: SoundEffect) {
  if (typeof document === "undefined" || document.visibilityState === "hidden" || volume === 0) return;
  stopSound();
  const ticket = generation;
  if (!playBranded(effect, ticket)) synthesize(effect);
}
function synthesize(effect: SoundEffect) {
  const ctx = context();
  if (!ctx || ctx.state !== "running") return;
  const bus = ctx.createGain();
  bus.gain.value = volume;
  bus.connect(ctx.destination);
  activeBus = bus;
  window.setTimeout(() => { if (activeBus === bus) { bus.disconnect(); activeBus = null; } }, 900);
  const start = ctx.currentTime + 0.004;
  switch (effect) {
    case "select": tone(ctx, bus, 280, start, .055, .014, 170, "triangle"); break;
    case "play":
      tone(ctx, bus, 210, start, .09, .025, 110, "triangle");
      tone(ctx, bus, 430, start + .018, .06, .012, 260); break;
    case "take":
      tone(ctx, bus, 315, start, .16, .021, 90, "triangle");
      tone(ctx, bus, 160, start + .075, .1, .008, 75); break;
    case "burn":
      tone(ctx, bus, 520, start, .24, .032, 82, "sawtooth");
      tone(ctx, bus, 150, start + .1, .15, .015, 55, "triangle"); break;
    case "snap":
      tone(ctx, bus, 740, start, .08, .027, 310, "square");
      tone(ctx, bus, 1010, start + .035, .1, .016, 640); break;
    case "slam":
      tone(ctx, bus, 180, start, .12, .027, 75, "triangle");
      tone(ctx, bus, 620, start + .024, .12, .014, 205, "square"); break;
    case "dump":
      tone(ctx, bus, 420, start, .12, .015, 220, "triangle");
      tone(ctx, bus, 250, start + .085, .14, .012, 105); break;
    case "reset":
      tone(ctx, bus, 360, start, .11, .012, 510, "sine"); break;
    case "ghost":
      tone(ctx, bus, 480, start, .14, .008, 250, "sine"); break;
    case "under":
      tone(ctx, bus, 290, start, .12, .014, 210, "triangle"); break;
    case "skip":
      tone(ctx, bus, 510, start, .07, .011, 680); break;
    case "counter":
      tone(ctx, bus, 180, start, .09, .018, 390, "triangle");
      tone(ctx, bus, 390, start + .09, .13, .018, 610, "triangle"); break;
    case "reject":
      tone(ctx, bus, 210, start, .11, .019, 105, "triangle");
      tone(ctx, bus, 140, start + .12, .09, .012, 75, "triangle"); break;
    case "deal":
      for (let i=0;i<3;i++) tone(ctx, bus, 250+i*35, start+i*.055, .065, .012, 130, "triangle");
      break;
    case "loss":
      tone(ctx, bus, 330, start, .14, .014, 220, "triangle");
      tone(ctx, bus, 220, start+.14, .2, .014, 130, "triangle"); break;
    case "win":
      tone(ctx, bus, 392, start, .15, .018);
      tone(ctx, bus, 494, start + .12, .16, .018);
      tone(ctx, bus, 587, start + .25, .35, .02); break;
  }
}
