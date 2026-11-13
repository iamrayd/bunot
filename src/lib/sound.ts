/**
 * Small synthesized sounds. No audio files.
 * Browsers only allow sound after a tap or key press, so `unlockSound` must run inside one first.
 */
type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(next: boolean) { muted = next; }

export function unlockSound() {
  try {
    const Ctor: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* no sound on this device */ }
}

const ready = () => (!muted && ctx && ctx.state === 'running' ? ctx : null);

/** A bell: one tone plus two quieter, shorter overtones. */
function bell(c: AudioContext, freq: number, delay: number, seconds: number, volume: number) {
  const t = c.currentTime + delay;
  for (const [mult, amp, len] of [[1, 1, 1], [2.76, 0.3, 0.5], [5.4, 0.1, 0.25]]) {
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume * amp, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds * len);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + seconds * len + 0.05);
  }
}

/** Paper: a short burst of filtered noise. */
function rustle(c: AudioContext, delay: number, seconds: number, volume: number) {
  const t = c.currentTime + delay;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
  src.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = 3200;
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + seconds * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t);
}

function run(fn: (c: AudioContext) => void) {
  const c = ready();
  if (!c) return;
  try { fn(c); } catch { /* sound is never worth an error */ }
}

export const play = {
  /** A guest sat down. */
  sit: () => run((c) => bell(c, 1318.5, 0, 0.7, 0.06)),
  /** A rolled paper left the jar. */
  paper: () => run((c) => { rustle(c, 0, 0.16, 0.07); rustle(c, 0.2, 0.22, 0.05); }),
  /** The host opened the jar. */
  open: () => run((c) => { bell(c, 783.99, 0, 1.1, 0.07); bell(c, 1174.66, 0.16, 1.3, 0.07); }),
  /** My name unrolled. */
  reveal: () => run((c) => [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(c, f, i * 0.11, 1.5, 0.07))),
};
