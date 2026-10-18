/**
 * Muat berkas .env di folder aplikasi. HARUS menjadi impor PERTAMA server.ts, karena modul lain
 * (mis. database) membaca process.env saat diimpor.
 * Variabel yang sudah diset di sistem/terminal TIDAK ditimpa.
 * Dulu .env tidak pernah dimuat: GEMINI_API_KEY dan LAN_KEY yang diisi di .env diabaikan.
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env'), quiet: true });
