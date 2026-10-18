/**
 * Muat berkas .env di folder aplikasi. HARUS menjadi impor PERTAMA server.ts, karena modul lain
 * (mis. database) membaca process.env saat diimpor.
 * Variabel yang sudah diset di sistem/terminal TIDAK ditimpa.
 * Dulu .env tidak pernah dimuat: GEMINI_API_KEY dan LAN_KEY yang diisi di .env diabaikan.
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env'), quiet: true });

// Nilai contoh dari .env.example lama (disalin otomatis saat instalasi) dianggap KOSONG.
// Dulu GEMINI_API_KEY="MY_GEMINI_API_KEY" terbaca sebagai kunci sungguhan: aplikasi mengira
// fitur AI aktif lalu setiap panggilan ke Gemini ditolak.
for (const key of Object.keys(process.env)) {
  const value = (process.env[key] || '').trim();
  if (/^MY_[A-Z0-9_]+$/.test(value) || /^(your|isi)[-_ ]?(api[-_ ]?)?key/i.test(value)) {
    delete process.env[key];
  }
}
