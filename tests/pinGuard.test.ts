import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
};

test('batas salah PIN: 5 kali salah terkunci 30 detik, makin lama bila diulang, reset saat berhasil', async () => {
  const { registerPinFailure, registerPinSuccess, pinLockSecondsLeft } = await import('../src/utils/pinGuard.ts');
  const t0 = 1_000_000;
  for (let i = 0; i < 4; i++) assert.equal(registerPinFailure(t0), 0, 'empat kali salah belum terkunci');
  assert.equal(registerPinFailure(t0), 30, 'kelima kali salah: terkunci 30 detik');
  assert.equal(pinLockSecondsLeft(t0 + 10_000), 20);
  assert.equal(pinLockSecondsLeft(t0 + 31_000), 0, 'setelah jeda boleh mencoba lagi');
  assert.equal(registerPinFailure(t0 + 31_000), 60, 'salah lagi: jeda dua kali lipat');
  registerPinSuccess();
  assert.equal(pinLockSecondsLeft(t0 + 31_000), 0);
  assert.equal(registerPinFailure(t0 + 40_000), 0, 'hitungan mulai dari awal setelah berhasil');
});
