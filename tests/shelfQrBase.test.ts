import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveShelfBase, getDynamicShelfUrl, setShelfQrBase } from '../src/utils/qrLabelGenerator.ts';

test('QR label rak: localhost diganti alamat jaringan server; tanpa jaringan diberi peringatan', () => {
  // Dibuka lewat alamat jaringan: dipakai apa adanya
  assert.deepEqual(resolveShelfBase('http://192.168.1.10:3000', '192.168.1.10'), { base: 'http://192.168.1.10:3000' });
  // Dibuka lewat localhost (MULAI-KASIR.bat): pakai alamat jaringan dari /api/lan/status
  assert.deepEqual(resolveShelfBase('http://localhost:3000', 'localhost', { recommendedUrl: 'http://192.168.1.10:3000/' }), { base: 'http://192.168.1.10:3000' });
  assert.deepEqual(resolveShelfBase('http://127.0.0.1:3000', '127.0.0.1', { recommendedUrl: 'http://10.0.0.5:3000' }), { base: 'http://10.0.0.5:3000' });
  // Tidak ada alamat jaringan: tetap localhost + peringatan
  const r = resolveShelfBase('http://localhost:3000', 'localhost', { recommendedUrl: 'http://127.0.0.1:3000' });
  assert.equal(r.base, 'http://localhost:3000');
  assert.match(r.warning || '', /tidak bisa dibuka dari HP/i);
  assert.ok(resolveShelfBase('http://localhost:3000', 'localhost', null).warning);
  // Alamat QR mengikuti alamat dasar yang diatur
  setShelfQrBase('http://192.168.1.10:3000/');
  assert.equal(getDynamicShelfUrl('prod 1'), 'http://192.168.1.10:3000/?shelf=prod%201');
  setShelfQrBase(null);
});
