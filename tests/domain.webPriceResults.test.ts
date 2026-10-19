import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAiPrices, parsePrice, stapleCommodityOf, packSizeOf } from '../src/domain/webPriceResults.ts';

const sources = [
  { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AAA', title: 'klikindomaret.com' },
  { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/BBB', title: 'panelharga.badanpangan.go.id' },
];

test('harga hanya diterima bila situs sumbernya benar-benar ditemukan pencarian', () => {
  const r = validateAiPrices(
    [
      { source: 'KlikIndomaret', price: 'Rp 15.900', date: '2026-10-18' },
      { source: 'alfagift.id', price: 15500 }, // tidak ada di hasil pencarian -> dibuang
      { source: 'Toko Karangan', price: 9000 },
    ],
    sources,
    'competitor',
    '2026-10-19'
  );
  assert.equal(r.length, 1);
  assert.equal(r[0]!.domain, 'klikindomaret.com');
  assert.equal(r[0]!.price, 15900);
  assert.equal(r[0]!.observedAt, '2026-10-18');
});

test('mode acuan pemerintah hanya menerima situs .go.id; tanggal masa depan dibatasi hari ini', () => {
  const raw = [
    { source: 'panelharga.badanpangan.go.id', price: 18379, unit: 'kg', date: '2030-01-01' },
    { source: 'klikindomaret.com', price: 17000 },
  ];
  const r = validateAiPrices(raw, sources, 'official', '2026-10-19');
  assert.equal(r.length, 1);
  assert.equal(r[0]!.domain, 'panelharga.badanpangan.go.id');
  assert.equal(r[0]!.observedAt, '2026-10-19');
});

test('parsePrice memahami format Rupiah', () => {
  assert.equal(parsePrice('Rp 15.500'), 15500);
  assert.equal(parsePrice('Rp15.500,00'), 15500);
  assert.equal(parsePrice('abc'), null);
  assert.equal(parsePrice(-5), null);
});

test('komoditas pokok & ukuran kemasan dikenali dari nama produk', () => {
  assert.equal(stapleCommodityOf('Gula Pasir Gulaku 1kg')?.id, 'gula');
  assert.equal(stapleCommodityOf('Gula Aren Cair 250ml'), null);
  assert.equal(stapleCommodityOf('Minyak Goreng Bimoli 2L')?.id, 'minyak_kemasan');
  assert.equal(stapleCommodityOf('Beras Premium Rojolele 5 kg')?.id, 'beras_premium');
  assert.equal(stapleCommodityOf('Indomie Goreng'), null);
  assert.equal(packSizeOf('Minyak Goreng Bimoli 2L', 'liter'), 2);
  assert.equal(packSizeOf('Gula Pasir 500 gr', 'kg'), 0.5);
  assert.equal(packSizeOf('Minyak Goreng 900ml', 'liter'), 0.9);
  assert.equal(packSizeOf('Telur Ayam', 'kg'), null);
});
