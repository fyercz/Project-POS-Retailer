import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysUntil } from '../src/domain/expiry.ts';

test('sisa hari dihitung per hari kalender lokal', () => {
  const now = new Date(2026, 9, 18, 1, 30); // 18 Okt 2026 pukul 01.30
  assert.equal(daysUntil('2026-10-18', now), 0);
  assert.equal(daysUntil('2026-10-19', now), 1);
  assert.equal(daysUntil('2026-10-17', now), -1);
  assert.equal(daysUntil('2026-11-17', now), 30);
  const late = new Date(2026, 9, 18, 23, 59);
  assert.equal(daysUntil('2026-10-19', late), 1, 'tengah malam tidak menggeser hitungan');
  assert.equal(daysUntil(undefined, now), null);
  assert.equal(daysUntil('bukan tanggal', now), null);
});
