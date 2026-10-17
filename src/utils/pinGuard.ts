/**
 * Batas percobaan PIN salah (layar kunci, login, otorisasi Supervisor/Owner).
 * PIN 4 digit hanya 10.000 kemungkinan, jadi tanpa batas bisa ditebak di kasir.
 * Setelah 5 kali salah: jeda 30 detik, lalu bertambah dua kali lipat (maks. 15 menit).
 * Disimpan di localStorage agar tidak hilang dengan memuat ulang halaman.
 */
const KEY = 'pos_pin_guard_v1';
const MAX_FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 15 * 60_000;

interface GuardState {
  failures: number;
  lockedUntil: number;
}

function read(): GuardState {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v.failures === 'number' && typeof v.lockedUntil === 'number') return v;
  } catch {}
  return { failures: 0, lockedUntil: 0 };
}

function write(state: GuardState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

/** Sisa detik terkunci (0 = boleh mencoba). */
export function pinLockSecondsLeft(now: number = Date.now()): number {
  const { lockedUntil } = read();
  return lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
}

export function registerPinFailure(now: number = Date.now()): number {
  const state = read();
  state.failures += 1;
  if (state.failures >= MAX_FREE_ATTEMPTS) {
    const extra = state.failures - MAX_FREE_ATTEMPTS;
    state.lockedUntil = now + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** extra);
  }
  write(state);
  return pinLockSecondsLeft(now);
}

export function registerPinSuccess(): void {
  write({ failures: 0, lockedUntil: 0 });
}

export function pinLockMessage(seconds: number): string {
  return seconds >= 60
    ? `Terlalu banyak PIN salah. Coba lagi dalam ${Math.ceil(seconds / 60)} menit.`
    : `Terlalu banyak PIN salah. Coba lagi dalam ${seconds} detik.`;
}
