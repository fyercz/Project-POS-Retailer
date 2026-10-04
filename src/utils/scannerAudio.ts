/**
 * Audio feedback generator for POS barcode scanning using Web Audio API.
 * High-precision, zero external audio files, works offline and instantly across all browsers.
 * Provides subtle, delightful acoustic chirps:
 * - Success chirp: Crisp, ascending dual-tone retail chirp (product recognized in database)
 * - Error chirp: Subtle, descending two-tone reminder chirp (product not found in database)
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a subtle, crisp cashier scanner affirmative chirp.
 * Two-stage ascending harmonic chime (1760Hz -> 2350Hz)
 * Indicating the product was found and added to cart.
 */
export function playBarcodeSuccessChirp(volume: number = 0.10): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: 1760Hz (Note A6) - 40ms
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1760, now);

    // Smooth envelope attack (4ms) to avoid clicks, quick release
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(volume * 0.85, now + 0.004);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.048);

    // Tone 2: 2349Hz (Note D7) - 60ms
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2349, now + 0.038);

    gain2.gain.setValueAtTime(0.0001, now + 0.038);
    gain2.gain.linearRampToValueAtTime(volume, now + 0.042);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.105);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.038);
    osc2.stop(now + 0.11);
  } catch {
    // Graceful fallback if audio is restricted by autoplay policies
  }
}

/**
 * Play a subtle, distinct error chirp.
 * Two-stage descending blip (440Hz -> 294Hz) with gentle decay.
 * Signals that the barcode was read, but NOT found in the database.
 * Designed to be polite and non-jarring to store customers.
 */
export function playBarcodeErrorChirp(volume: number = 0.12): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Beep 1: 440Hz (Note A4) - 50ms
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle'; // Soft warm timbre, not harsh sawtooth
    osc1.frequency.setValueAtTime(440, now);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.058);

    // Brief gap (25ms), then Beep 2: 294Hz (Note D4) - 75ms
    const secondStart = now + 0.075;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(294, secondStart);

    gain2.gain.setValueAtTime(0.0001, secondStart);
    gain2.gain.linearRampToValueAtTime(volume * 0.9, secondStart + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.0001, secondStart + 0.085);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(secondStart);
    osc2.stop(secondStart + 0.09);
  } catch {
    // Graceful fallback
  }
}

/**
 * Play a subtle click/tick sound for button interactions or focus
 */
export function playClickSound(volume: number = 0.04): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch {
    // Graceful fallback
  }
}

/**
 * Universal dispatcher for cashier audio feedback
 * @param type 'success' | 'error' | 'click'
 * @param options optional custom volume override
 */
export function playScannerSound(
  type: 'success' | 'error' | 'click' = 'success',
  options?: { volume?: number }
): void {
  const vol = options?.volume;
  if (type === 'success') {
    playBarcodeSuccessChirp(vol);
  } else if (type === 'error') {
    playBarcodeErrorChirp(vol);
  } else if (type === 'click') {
    playClickSound(vol);
  }
}
