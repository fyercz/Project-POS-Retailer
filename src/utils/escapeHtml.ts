/**
 * Escape teks sebelum disisipkan ke string HTML (label harga, laporan, struk, PO).
 * Nama produk/member bisa berasal dari impor CSV, perangkat LAN, atau pencarian online,
 * jadi wajib di-escape agar tidak bisa menyisipkan <script> / onerror=... (XSS).
 */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Salinan dangkal objek dengan semua field bertipe string sudah di-escape. Angka tidak berubah. */
export function escapeTextFields<T extends object>(obj: T): T {
  const out: any = { ...obj };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string') out[k] = escapeHtml(v);
  }
  return out;
}
