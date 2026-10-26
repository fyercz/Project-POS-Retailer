import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { planPriceUpdates, parseDelimitedText, parsePriceValue } from '../src/domain/priceUpdatePlan.ts';
import { readXlsx } from '../src/utils/xlsxReader.ts';

const products = [
  { id: 'a', name: 'Merica 4G', barcode: '8991001', sku: 'MRC-4', price: 500, costPrice: 792 },
  { id: 'b', name: 'Aqua 330', barcode: '8991002', sku: 'AQ-330', price: 1500, costPrice: 1400 },
  { id: 'c', name: 'Gula 1kg', barcode: '8991003', sku: 'GL-1', price: 18000, costPrice: 16500 },
];

test('rencana: kolom Harga Dipakai diutamakan, peringatan, baris tak cocok & tidak valid', () => {
  const rows = parseDelimitedText(
    'Barcode;Nama;Harga Jual Sekarang;Usulan Harga;Harga Dipakai\n8991001;Merica;500;1000;1000\n8991002;Aqua;1500;1700;1500\n8991003;Gula;18000;;15000\n9999999;Tak ada;1;1;1\n8991003;Gula lagi;;;19000'
  );
  const plan: any = planPriceUpdates(rows, products);
  assert.equal(plan.priceColumn, 'Harga Dipakai');
  assert.deepEqual(plan.changes.map((c: any) => [c.productId, c.newPrice, c.warnings]), [['a', 1000, ['berubah lebih dari 50%']], ['c', 15000, ['di bawah harga modal']]]);
  assert.equal(plan.unchanged, 1);
  assert.deepEqual(plan.unmatched.map((u: any) => u.key), ['9999999']);
  assert.equal(plan.invalid[0].reason, 'produk muncul lebih dari sekali');
});

test('CSV koma dengan tanda kutip & kolom SKU; format harga Indonesia', () => {
  const rows = parseDelimitedText('sku,harga_jual\n"AQ-330","1.700"\nGL-1,"Rp 19.500"\n');
  const plan: any = planPriceUpdates(rows, products);
  assert.deepEqual(plan.changes.map((c: any) => [c.productId, c.newPrice]), [['b', 1700], ['c', 19500]]);
  assert.equal(parsePriceValue('15500.0'), 15500);
  assert.equal(parsePriceValue('abc'), null);
  assert.ok('error' in (planPriceUpdates([['nama', 'stok']], products) as any));
});

test('xlsx: nilai tersimpan dari sel berumus terbaca (shared strings & angka)', () => {
  const xml = (s: string) => strToU8(s);
  const zip = zipSync({
    'xl/workbook.xml': xml('<workbook><sheets><sheet name="Rugi &amp; Impas" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': xml('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/sharedStrings.xml': xml('<sst><si><t>Barcode</t></si><si><t>Harga Dipakai</t></si><si><t>8991001</t></si></sst>'),
    'xl/worksheets/sheet1.xml': xml('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><f>IF(B2&gt;0,1000,0)</f><v>1000</v></c></row></sheetData></worksheet>'),
  });
  const [sheet] = readXlsx(zip);
  assert.equal(sheet!.name, 'Rugi & Impas');
  assert.deepEqual(sheet!.rows, [['Barcode', '', 'Harga Dipakai'], ['8991001', '', '1000']]);
  const plan: any = planPriceUpdates(sheet!.rows, products);
  assert.deepEqual(plan.changes.map((c: any) => [c.productId, c.newPrice]), [['a', 1000]]);
});
