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

test('kontras: tulisan putih tidak di atas warna terang 400/500 (diam maupun hover), semua warna', () => {
  // Audit pertama hanya memeriksa hijau; tes hover E2E menemukan tombol biru & merah yang sama (3,75:1)
  const v = violations((l) => /(?<![\w:-])text-white\b/.test(l) && /(?<![\w:-])(?:hover:)?bg-(?:emerald|blue|rose|indigo|amber)-(?:400|500)\b/.test(l));
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

// Palet resmi dalam hex (Tailwind v4: slate, emerald, amber, rose, blue, indigo + putih/hitam)
const PALETTE_HEX = new Set(['#000000', '#020617', '#022c22', '#047857', '#059669', '#064e3b', '#065f46', '#0f172a', '#10b981', '#172554', '#1d4ed8', '#1e1b4b', '#1e293b', '#1e3a8a', '#1e40af', '#2563eb', '#312e81', '#334155', '#34d399', '#3730a3', '#3b82f6', '#4338ca', '#451a03', '#475569', '#4c0519', '#4f46e5', '#60a5fa', '#6366f1', '#64748b', '#6ee7b7', '#78350f', '#818cf8', '#881337', '#92400e', '#93c5fd', '#94a3b8', '#9f1239', '#a5b4fc', '#a7f3d0', '#b45309', '#be123c', '#bfdbfe', '#c7d2fe', '#cbd5e1', '#d1fae5', '#d97706', '#dbeafe', '#e0e7ff', '#e11d48', '#e2e8f0', '#ecfdf5', '#eef2ff', '#eff6ff', '#f1f5f9', '#f43f5e', '#f59e0b', '#f8fafc', '#fb7185', '#fbbf24', '#fcd34d', '#fda4af', '#fde68a', '#fecdd3', '#fef3c7', '#ffe4e6', '#fff1f2', '#fffbeb', '#ffffff']);

test('warna hex hanya dari palet resmi (kecuali logo merek)', () => {
  const v: string[] = [];
  const all = [...files, ...fs.readdirSync('src/utils').filter((f) => f.endsWith('.ts')).map((f) => ({ f: 'utils/' + f, lines: fs.readFileSync(path.join('src/utils', f), 'utf8').split('\n') }))];
  for (const { f, lines } of all) {
    if (f.includes('UlilMartLogo')) continue;
    lines.forEach((l, i) => (l.match(/#[0-9a-fA-F]{6}\b/g) || []).forEach((h) => !PALETTE_HEX.has(h.toLowerCase()) && v.push(`${f}:${i + 1}: ${h}`)));
  }
  assert.equal(v.length, 0, report(v));
});

test('ikon: tidak ada emoji di teks antarmuka yang dibentuk lewat kode (label, opsi, notifikasi)', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  // Isi pesan WhatsApp / bagikan / salin / cetak boleh beremoji
  const messageContext = /wa\.me|whatsapp|WhatsApp|encodeURIComponent|message|pesan|template|caption|share|navigator\.share|clipboard|copy|print|Print|\\n/;
  const v: string[] = [];
  for (const { f, lines } of files)
    lines.forEach((l, i) => {
      const t = l.trim();
      if (!emoji.test(l) || t.startsWith('//') || t.startsWith('*') || t.startsWith('{/*')) return;
      if (messageContext.test(lines.slice(Math.max(0, i - 6), i + 1).join(' '))) return;
      v.push(`${f}:${i + 1}: ${t.slice(0, 110)}`);
    });
  assert.equal(v.length, 0, report(v));
});

test('jendela: lapisan latar standar bg-slate-950/80 backdrop-blur-xs (kecuali layar kunci)', () => {
  const v: string[] = [];
  for (const { f, lines } of files)
    lines.forEach((l, i) => {
      if (!/fixed inset-0/.test(l) || !/(?<![\w:-])bg-(?:slate-9\d0|black|white)\/\d+/.test(l)) return;
      if (/data-overlay="lock"/.test(lines.slice(Math.max(0, i - 2), i + 1).join(' '))) return;
      if (!/(?<![\w:-])bg-slate-950\/80\b/.test(l) || !/backdrop-blur-xs\b/.test(l) || /bg-(?:black|white)\//.test(l)) v.push(`${f}:${i + 1}: ${l.trim().slice(0, 110)}`);
    });
  assert.equal(v.length, 0, report(v));
});
