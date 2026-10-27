/**
 * Aturan DESIGN_SYSTEM.md diperiksa otomatis di setiap perubahan (audit 2026-10-26 menemukan
 * ±150 pelanggaran yang menumpuk setelah dokumen dibuat, termasuk dari kode baru).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? tsxFiles(p) : p.endsWith('.tsx') ? [p] : [];
  });
}
const files = tsxFiles('src').map((f) => ({ f: path.relative('src', f), lines: fs.readFileSync(f, 'utf8').split('\n') }));

function violations(test: (line: string) => boolean) {
  const out: string[] = [];
  for (const { f, lines } of files) lines.forEach((l, i) => test(l) && out.push(`${f}:${i + 1}: ${l.trim().slice(0, 110)}`));
  return out;
}
const report = (v: string[]) => `${v.length} pelanggaran:\n${v.slice(0, 15).join('\n')}`;

test('kontras: tulisan putih tidak di atas emerald-400/500 (diam maupun hover)', () => {
  const v = violations((l) => /text-white/.test(l) && /(?<![\w:-])(?:hover:)?bg-emerald-(?:400|500)\b/.test(l));
  assert.equal(v.length, 0, report(v));
});

test('warna: hanya 5 warna bermakna + slate', () => {
  const v = violations((l) => /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-(?:purple|violet|fuchsia|teal|cyan|sky|orange|yellow|red|pink|green|lime)-\d{2,3}\b/.test(l));
  assert.equal(v.length, 0, report(v));
});

test('kontras: tidak ada teks slate-400 di latar terang', () => {
  // Boleh di atas latar gelap (bg-slate-700..950), mis. tombol di bilah gelap
  const v = violations((l) => /(?<![\w:-])text-slate-400\b/.test(l) && !/placeholder|disabled:|group-hover|line-through|(?<![\w:-])bg-slate-(?:700|800|900|950)\b/.test(l));
  assert.equal(v.length, 0, report(v));
});

test('tipografi: tidak ada ukuran huruf di bawah 11px', () => {
  const v = violations((l) => /text-\[(?:[0-9]|10)px\]/.test(l));
  assert.equal(v.length, 0, report(v));
});

test('sudut: hanya rounded-md / xl / 2xl / full', () => {
  const v = violations((l) => /(?<![\w-])rounded-(?:sm|lg|3xl)\b/.test(l));
  assert.equal(v.length, 0, report(v));
});

test('bayangan: hanya shadow-sm / md / xl', () => {
  const v = violations((l) => /(?<![\w-])shadow-(?:inner|lg|2xl)\b/.test(l));
  assert.equal(v.length, 0, report(v));
});

test('gerak: animate-pulse hanya untuk titik status kecil', () => {
  const v = violations((l) => /\banimate-pulse\b/.test(l) && !/\b[wh]-(?:1|1\.5|2|2\.5)\b/.test(l));
  assert.equal(v.length, 0, report(v));
});

test('ikon: tidak ada emoji di teks antarmuka (label, tombol, judul)', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  const v = violations((l) => (l.match(/>[^<>{}`=&|;()]*</g) || []).some((t) => emoji.test(t)));
  assert.equal(v.length, 0, report(v));
});
