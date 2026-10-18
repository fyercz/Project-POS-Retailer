import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movableDateFor, nextMovableDate } from '../src/domain/religiousHolidays.ts';
import { findDemandEventForDate, DEFAULT_DEMAND_EVENTS } from '../src/utils/salesForecaster.ts';

test('Idul Fitri & Idul Adha mengikuti tanggal resmi per tahun, bukan tanggal tetap', () => {
  assert.deepEqual(movableDateFor('idul_fitri', 2026), { date: '2026-03-21', official: true });
  assert.deepEqual(movableDateFor('idul_fitri', 2027, -1), { date: '2027-03-09', official: true });
  assert.equal(movableDateFor('idul_adha', 2027)?.date, '2027-05-17');
  assert.equal(movableDateFor('idul_fitri', 2099), null, 'tahun tanpa data: tidak menebak');
});

test('kalender proyeksi: Lebaran 2027 dikenali di 9-10 Maret, 20 Maret 2027 bukan Lebaran', () => {
  const at = (y: number, m: number, d: number) => findDemandEventForDate(new Date(y, m - 1, d), DEFAULT_DEMAND_EVENTS);
  assert.equal(at(2027, 3, 9)?.id, 'evt-lebaran-h1');
  assert.equal(at(2027, 3, 10)?.id, 'evt-lebaran-h0');
  assert.equal(at(2026, 3, 20)?.id, 'evt-lebaran-h1');
  assert.notEqual(at(2027, 3, 20)?.id, 'evt-lebaran-h1', 'tanggal tetap lama tidak boleh cocok lagi');
  assert.equal(at(2027, 5, 17)?.id, 'evt-idul-adha');
});

test('tahun yang masih perkiraan diberi label "perkiraan"', () => {
  const ev = findDemandEventForDate(new Date(2028, 1, 27), DEFAULT_DEMAND_EVENTS);
  assert.equal(ev?.id, 'evt-lebaran-h0');
  assert.match(ev!.badge, /perkiraan/);
  const next = nextMovableDate('idul_fitri', new Date(2026, 9, 19));
  assert.equal(next?.date, '2027-03-10');
  assert.equal(next?.official, true);
});
