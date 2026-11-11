/**
 * Menulis Laporan Kas Bulanan ke Excel dengan format laporan manual toko (LAP.HARI / LAP.BLN /
 * PPOB / LABA). Saldo, jumlah, & rekap per jenis memakai RUMUS (SUMIF per kolom JENIS), bukan
 * penjumlahan manual baris per baris seperti di file Excel toko.
 */
import type { Workbook, Worksheet } from 'exceljs';
import type { buildKasBulanan, KasJenis } from '../domain/kasReport';

type KasReport = ReturnType<typeof buildKasBulanan>;

export interface LabaInput {
  storeName: string;
  storeAddress?: string;
  managerName?: string;
  salesSystem: number; // penjualan bersih menurut aplikasi
  grossProfit: number;
  otherIncome: Record<string, number>; // label -> nominal (sewa rak, sewa tempat, kardus, laba PPOB)
  expenses: Record<string, number>; // label -> nominal
}

const RP = '"Rp"#,##0;[Red]-"Rp"#,##0;"-"';
const FONT = { name: 'Arial', size: 10 };
const BOLD = { name: 'Arial', size: 10, bold: true };

const JENIS_LABEL: Record<KasJenis, string> = {
  saldo_awal: 'SALDO AWAL',
  penjualan: 'PENDAPATAN PENJUALAN BARANG',
  pembelian: 'PEMBELIAN BARANG',
  tagihan: 'TAGIHAN',
  beban: 'BEBAN TOKO',
  kas_masuk: 'KAS MASUK LAIN-LAIN (SEWA RAK, DLL.)',
  penarikan: 'PENARIKAN KAS',
  debit: 'DEBIT (NON-TUNAI)',
};
const SUMMARY: Array<[KasJenis, 'D' | 'E']> = [
  ['penjualan', 'D'],
  ['pembelian', 'E'],
  ['tagihan', 'E'],
  ['beban', 'E'],
  ['kas_masuk', 'D'],
  ['penarikan', 'E'],
  ['debit', 'D'],
];

function header(ws: Worksheet, row: number, title: string, meta: LabaInput) {
  const lines = [title, `' ${meta.storeName} ''`, meta.storeAddress || ''];
  lines.forEach((t, i) => {
    if (!t) return;
    ws.mergeCells(`A${row + i}:F${row + i}`);
    const c = ws.getCell(`A${row + i}`);
    c.value = t;
    c.font = i === 0 ? { ...BOLD, size: 12 } : BOLD;
    c.alignment = { horizontal: 'center' };
  });
}

function tableHead(ws: Worksheet, row: number) {
  ['NO', 'TGL', 'URAIAN', 'DEBET', 'KREDIT', 'SALDO', 'JENIS'].forEach((h, i) => {
    const c = ws.getRow(row).getCell(i + 1);
    c.value = h;
    c.font = BOLD;
    c.alignment = { horizontal: 'center' };
    c.border = { bottom: { style: 'thin' }, top: { style: 'thin' } };
  });
}

export async function buildKasWorkbook(report: KasReport, meta: LabaInput): Promise<Workbook> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const bulan = `${report.monthName.toUpperCase()}`;

  // ---------- LAP.HARI ----------
  const hari = wb.addWorksheet('LAP.HARI');
  hari.columns = [{ width: 5 }, { width: 12 }, { width: 46 }, { width: 16 }, { width: 16 }, { width: 17 }, { width: 14, hidden: true }];
  let r = 1;
  const dayRefs: Array<{ date: string; opening: string; sums: Record<string, string>; closing: string }> = [];
  report.days.forEach((d, i) => {
    header(hari, r, d.title, meta);
    r += 4;
    tableHead(hari, r);
    r++;
    const first = r;
    d.rows.forEach((row, k) => {
      const x = hari.getRow(r);
      if (k === 0) {
        x.getCell(1).value = i + 1;
        const [y, m, dd] = d.date.split('-').map(Number);
        x.getCell(2).value = new Date(Date.UTC(y!, m! - 1, dd!));
        x.getCell(2).numFmt = 'dd/mm/yyyy';
      } else x.getCell(2).value = '-';
      x.getCell(3).value = row.uraian;
      if (row.debet) x.getCell(4).value = row.debet;
      if (row.kredit) x.getCell(5).value = row.kredit;
      x.getCell(6).value = { formula: k === 0 ? `D${r}` : `F${r - 1}+D${r}-E${r}` };
      x.getCell(7).value = row.jenis;
      [4, 5, 6].forEach((c) => (x.getCell(c).numFmt = RP));
      x.font = FONT;
      r++;
    });
    const last = r - 1;
    const sum = hari.getRow(r);
    sum.getCell(3).value = 'JUMLAH';
    sum.getCell(4).value = { formula: `SUM(D${first}:D${last})` };
    sum.getCell(5).value = { formula: `SUM(E${first}:E${last})` };
    sum.getCell(6).value = { formula: `D${r}-E${r}` };
    [4, 5, 6].forEach((c) => (sum.getCell(c).numFmt = RP));
    sum.font = BOLD;
    const closing = `F${r}`;
    r += 2;
    const sums: Record<string, string> = {};
    for (const [jenis, col] of SUMMARY) {
      const x = hari.getRow(r);
      x.getCell(1).value = '-';
      x.getCell(2).value = JENIS_LABEL[jenis];
      x.getCell(6).value = { formula: `SUMIF(G${first}:G${last},"${jenis}",${col}${first}:${col}${last})` };
      x.getCell(6).numFmt = RP;
      x.font = FONT;
      sums[jenis] = `F${r}`;
      r++;
    }
    dayRefs.push({ date: d.date, opening: `D${first}`, sums, closing });
    r += 3;
  });

  // ---------- LAP.BLN ----------
  const bln = wb.addWorksheet('LAP.BLN');
  bln.columns = [{ width: 5 }, { width: 10 }, { width: 40 }, { width: 16 }, { width: 16 }, { width: 17 }, { width: 14, hidden: true }];
  header(bln, 1, `LAPORAN KAS BULAN ${bulan}`, meta);
  tableHead(bln, 4);
  r = 5;
  const blnFirst = r;
  dayRefs.forEach((d, i) => {
    const [, m, dd] = d.date.split('-').map(Number);
    const lines: Array<[string, string, 'D' | 'E', string]> = i === 0 ? [['saldo_awal', `Sisa Saldo Bulan Lalu`, 'D', d.opening]] : [];
    for (const [jenis, col] of SUMMARY) lines.push([jenis, JENIS_LABEL[jenis], col, d.sums[jenis]!]);
    lines.forEach(([jenis, label, col, ref], k) => {
      const x = bln.getRow(r);
      if (k === 0) {
        x.getCell(1).value = i + 1;
        x.getCell(2).value = `${dd} ${report.monthName.slice(0, 3)}`;
      } else x.getCell(2).value = ' - ';
      x.getCell(3).value = label;
      x.getCell(col === 'D' ? 4 : 5).value = { formula: `'LAP.HARI'!${ref}` };
      x.getCell(6).value = { formula: r === blnFirst ? `D${r}-E${r}` : `F${r - 1}+D${r}-E${r}` };
      x.getCell(7).value = jenis;
      [4, 5, 6].forEach((c) => (x.getCell(c).numFmt = RP));
      x.font = FONT;
      void m;
      r++;
    });
  });
  const blnLast = r - 1;
  r++;
  const totals: Record<string, string> = {};
  for (const [jenis, col] of SUMMARY) {
    const x = bln.getRow(r);
    x.getCell(3).value = `TOTAL ${JENIS_LABEL[jenis]}`;
    x.getCell(6).value = { formula: `SUMIF(G${blnFirst}:G${blnLast},"${jenis}",${col}${blnFirst}:${col}${blnLast})` };
    x.getCell(6).numFmt = RP;
    x.font = BOLD;
    totals[jenis] = `'LAP.BLN'!F${r}`;
    r++;
  }
  const saldoAkhirBln = `'LAP.BLN'!F${blnLast}`;

  // ---------- PPOB ----------
  const ppob = wb.addWorksheet('PPOB');
  ppob.columns = [{ width: 5 }, { width: 10 }, { width: 40 }, { width: 16 }, { width: 16 }, { width: 17 }];
  header(ppob, 1, `LAPORAN PPOB BULAN ${bulan}`, meta);
  tableHead(ppob, 5);
  ppob.getRow(5).getCell(7).value = null;
  r = 6;
  report.ppobRows.forEach((p, i) => {
    const x = ppob.getRow(r);
    x.getCell(1).value = i + 1;
    const [, , dd] = p.date.split('-').map(Number);
    x.getCell(2).value = `${dd} ${report.monthName.slice(0, 3)}`;
    x.getCell(3).value = p.uraian;
    if (p.debet) x.getCell(4).value = p.debet;
    if (p.kredit) x.getCell(5).value = p.kredit;
    // saldo awal PPOB = saldo baris pertama - (debet - kredit) baris pertama
    x.getCell(6).value = i === 0 ? { formula: `${p.saldo - p.debet + p.kredit}+D${r}-E${r}` } : { formula: `F${r - 1}+D${r}-E${r}` };
    [4, 5, 6].forEach((c) => (x.getCell(c).numFmt = RP));
    x.font = FONT;
    r++;
  });

  // ---------- LABA ----------
  const laba = wb.addWorksheet('LABA');
  laba.columns = [{ width: 4 }, { width: 50 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 18 }, { width: 18 }];
  header(laba, 1, `LAPORAN LABA RUGI BULAN ${bulan}`, meta);
  const put = (row: number, label: string, col: 'G' | 'H', value: number | { formula: string }, bold = false) => {
    laba.getCell(`B${row}`).value = label;
    laba.getCell(`${col}${row}`).value = value as never;
    laba.getCell(`${col}${row}`).numFmt = RP;
    laba.getRow(row).font = bold ? BOLD : FONT;
  };
  laba.getCell('A5').value = '* ARUS KAS BULAN INI (dari LAP.BLN)';
  laba.getCell('A5').font = BOLD;
  put(6, 'Pendapatan Penjualan (setoran kasir)', 'H', { formula: totals.penjualan! });
  put(7, 'Penjualan Debit (non-tunai)', 'H', { formula: totals.debit! });
  put(8, 'Kas Masuk Lain-lain (sewa rak, dll.)', 'H', { formula: totals.kas_masuk! });
  put(9, 'Pembelian Barang', 'H', { formula: `-${totals.pembelian}` });
  put(10, 'Tagihan', 'H', { formula: `-${totals.tagihan}` });
  put(11, 'Beban Toko (dari kas)', 'H', { formula: `-${totals.beban}` });
  put(12, 'Penarikan Kas', 'H', { formula: `-${totals.penarikan}` });
  put(13, 'PERUBAHAN KAS BULAN INI', 'G', { formula: 'SUM(H6:H12)' }, true);
  put(14, 'SALDO KAS AKHIR BULAN', 'G', { formula: saldoAkhirBln }, true);

  laba.getCell('A17').value = '* PERHITUNGAN MENURUT PENJUALAN SISTEM APLIKASI';
  laba.getCell('A17').font = BOLD;
  put(18, 'Hasil Penjualan Sistem (penjualan bersih)', 'H', meta.salesSystem);
  put(19, 'Laba Kotor', 'G', meta.grossProfit);
  laba.getCell('B20').value = { formula: `"Margin laba kotor "&TEXT(IF(H18=0,0,G19/H18),"0.00%")` };
  let lr = 22;
  laba.getCell(`B${lr}`).value = 'Pendapatan Lain-lain';
  laba.getCell(`B${lr}`).font = BOLD;
  lr++;
  const incStart = lr;
  for (const [k, v] of Object.entries(meta.otherIncome)) put(lr++, `- ${k}`, 'H', v);
  const incEnd = lr - 1;
  put(lr, 'Jumlah Pendapatan Lain-lain', 'G', { formula: incEnd >= incStart ? `SUM(H${incStart}:H${incEnd})` : '0' }, true);
  const incTotal = lr;
  lr += 2;
  laba.getCell(`B${lr}`).value = 'Beban Toko';
  laba.getCell(`B${lr}`).font = BOLD;
  lr++;
  const expStart = lr;
  for (const [k, v] of Object.entries(meta.expenses)) put(lr++, `- ${k}`, 'H', v);
  const expEnd = lr - 1;
  put(lr, 'Jumlah Beban Toko', 'G', { formula: expEnd >= expStart ? `SUM(H${expStart}:H${expEnd})` : '0' }, true);
  const expTotal = lr;
  lr += 2;
  put(lr, 'JUMLAH LABA BERSIH', 'H', { formula: `G19+G${incTotal}-G${expTotal}` }, true);
  laba.getCell(`B${lr + 1}`).value = 'Penarikan kas pemilik tidak termasuk beban (mengurangi modal).';
  laba.getCell(`B${lr + 1}`).font = { ...FONT, italic: true };
  if (meta.managerName) {
    laba.getCell(`H${lr + 4}`).value = 'MENGETAHUI';
    laba.getCell(`H${lr + 5}`).value = `MANAGER '' ${meta.storeName} ''`;
    laba.getCell(`H${lr + 8}`).value = meta.managerName;
  }
  return wb;
}
