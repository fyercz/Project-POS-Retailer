/**
 * Pembaca .xlsx ringan (tanpa SheetJS): buka arsip ZIP (fflate), baca daftar lembar, shared
 * strings, dan nilai sel. Untuk sel berumus dipakai NILAI TERSIMPAN (<v>) dari perhitungan terakhir
 * Excel/LibreOffice. Tanpa DOMParser agar bisa diuji di Node.
 */
import { unzipSync, strFromU8 } from 'fflate';

export interface SheetData {
  name: string;
  rows: string[][];
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&');

const colIndex = (ref: string) => {
  const letters = (/^[A-Z]+/.exec(ref) || ['A'])[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

export function readXlsx(data: ArrayBuffer | Uint8Array): SheetData[] {
  const files = unzipSync(data instanceof Uint8Array ? data : new Uint8Array(data));
  const text = (path: string) => (files[path] ? strFromU8(files[path]!) : '');

  const shared: string[] = [];
  for (const si of text('xl/sharedStrings.xml').match(/<si>[\s\S]*?<\/si>/g) || []) {
    shared.push(decodeXml((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((t) => t.replace(/<t[^>]*>|<\/t>/g, '')).join('')));
  }

  const rels: Record<string, string> = {};
  for (const m of text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) rels[id] = target.replace(/^\/?xl\//, '').replace(/^\//, '');
  }

  const sheets: SheetData[] = [];
  for (const m of text('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(/name="([^"]*)"/.exec(m[0])?.[1] || 'Sheet');
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1] || '';
    const xml = text(`xl/${rels[rid] || ''}`);
    const rows: string[][] = [];
    for (const rowXml of xml.match(/<row\b[\s\S]*?<\/row>/g) || []) {
      const r = Number(/\br="(\d+)"/.exec(rowXml)?.[1] || rows.length + 1) - 1;
      const row: string[] = [];
      for (const c of rowXml.match(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g) || []) {
        const ref = /\br="([A-Z]+\d+)"/.exec(c)?.[1] || '';
        const type = /\bt="([^"]+)"/.exec(c)?.[1];
        let v = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1] ?? '';
        if (type === 's') v = shared[Number(v)] ?? '';
        else if (type === 'inlineStr') v = (c.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((t) => t.replace(/<t[^>]*>|<\/t>/g, '')).join('');
        row[colIndex(ref)] = decodeXml(v);
      }
      rows[r] = Array.from(row, (x) => x ?? '');
    }
    sheets.push({ name, rows: Array.from(rows, (x) => x ?? []) });
  }
  return sheets;
}

/** Lembar -> teks berpemisah titik koma (untuk jendela impor yang membaca teks). */
export function sheetToDelimited(sheet: SheetData, sep = ';'): string {
  return sheet.rows.filter((r) => r.some((c) => (c || '').trim() !== '')).map((r) => r.map((c) => (c || '').replace(/[;\r\n]+/g, ' ')).join(sep)).join('\n');
}
