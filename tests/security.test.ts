import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAdminAccess, isAllowedOrigin, isSameOrigin, isTrustedHost, validateTransaction } from '../src/server/security.ts';

const base = { origin: undefined, host: 'localhost:3000', providedToken: undefined, adminToken: undefined };

test('isSameOrigin: tanpa Origin dianggap sah, host berbeda ditolak', () => {
  assert.equal(isSameOrigin(undefined, 'localhost:3000'), true);
  assert.equal(isSameOrigin('http://localhost:3000', 'localhost:3000'), true);
  assert.equal(isSameOrigin('https://situs-jahat.example', 'localhost:3000'), false);
  assert.equal(isSameOrigin('bukan-url', 'localhost:3000'), false);
});

test('admin: localhost boleh tanpa token', () => {
  assert.equal(checkAdminAccess({ ...base, remoteAddress: '127.0.0.1' }).allowed, true);
  assert.equal(checkAdminAccess({ ...base, remoteAddress: '::1' }).allowed, true);
  assert.equal(checkAdminAccess({ ...base, remoteAddress: '::ffff:127.0.0.1' }).allowed, true);
});

test('admin: IP LAN milik komputer server sendiri dianggap lokal', () => {
  const r = checkAdminAccess({ ...base, remoteAddress: '::ffff:192.168.1.5', localAddresses: ['192.168.1.5'] });
  assert.equal(r.allowed, true);
});

test('admin: perangkat LAN lain ditolak tanpa ADMIN_TOKEN', () => {
  const r = checkAdminAccess({ ...base, remoteAddress: '192.168.1.20', localAddresses: ['192.168.1.5'] });
  assert.equal(r.allowed, false);
});

test('admin: perangkat LAN lain boleh hanya dengan token yang cocok', () => {
  const ok = checkAdminAccess({ ...base, remoteAddress: '192.168.1.20', adminToken: 'rahasia', providedToken: 'rahasia' });
  const bad = checkAdminAccess({ ...base, remoteAddress: '192.168.1.20', adminToken: 'rahasia', providedToken: 'salah' });
  assert.equal(ok.allowed, true);
  assert.equal(bad.allowed, false);
});

test('admin: website lain (Origin berbeda) ditolak walau dari localhost', () => {
  const r = checkAdminAccess({ ...base, remoteAddress: '127.0.0.1', origin: 'https://situs-jahat.example' });
  assert.equal(r.allowed, false);
});

const goodTx = {
  id: 'tx-1',
  invoiceNumber: 'INV-1',
  status: 'completed',
  subtotal: 10000,
  taxAmount: 0,
  serviceChargeAmount: 0,
  discountAmount: 0,
  finalTotal: 10000,
  items: [{ quantity: 2, selectedUnit: { multiplier: 1 } }],
};

test('validateTransaction: transaksi normal lolos', () => {
  assert.equal(validateTransaction(goodTx), null);
});

test('validateTransaction: tolak total negatif, qty nol/negatif, NaN, dan tanpa id', () => {
  assert.notEqual(validateTransaction({ ...goodTx, finalTotal: -1 }), null);
  assert.notEqual(validateTransaction({ ...goodTx, items: [{ quantity: 0 }] }), null);
  assert.notEqual(validateTransaction({ ...goodTx, items: [{ quantity: -3 }] }), null);
  assert.notEqual(validateTransaction({ ...goodTx, subtotal: NaN }), null);
  assert.notEqual(validateTransaction({ ...goodTx, finalTotal: '10000' }), null);
  assert.notEqual(validateTransaction({ ...goodTx, id: undefined, invoiceNumber: undefined }), null);
  assert.notEqual(validateTransaction(null), null);
});

test('validateTransaction: retur/void boleh bernilai negatif', () => {
  assert.equal(validateTransaction({ ...goodTx, status: 'refunded', finalTotal: -10000 }), null);
});

test('isTrustedHost: nama lokal/toko dipercaya, domain publik tidak', () => {
  for (const h of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000', '192.168.1.5:3000', '10.0.0.7', '172.20.1.2:3000', 'kasir-pc:3000', 'toko.local:3000']) {
    assert.equal(isTrustedHost(h), true, h);
  }
  for (const h of ['evil.com', 'evil.com:3000', '8.8.8.8:3000', '172.32.0.1', 'sub.situs-jahat.example', undefined, '']) {
    assert.equal(isTrustedHost(h as any), false, String(h));
  }
});

test('isAllowedOrigin: perangkat LAN lain boleh, situs internet ditolak', () => {
  assert.equal(isAllowedOrigin('http://192.168.1.20:3000', '192.168.1.5:3000'), true);
  assert.equal(isAllowedOrigin('http://localhost:3000', '127.0.0.1:3000'), true);
  assert.equal(isAllowedOrigin('https://situs-jahat.example', '192.168.1.5:3000'), false);
});

test('admin: serangan DNS-rebinding (Host & Origin domain publik dari localhost) ditolak', () => {
  const r = checkAdminAccess({
    remoteAddress: '127.0.0.1',
    origin: 'http://evil.com:3000',
    host: 'evil.com:3000',
    providedToken: undefined,
    adminToken: undefined,
  });
  assert.equal(r.allowed, false);
});
