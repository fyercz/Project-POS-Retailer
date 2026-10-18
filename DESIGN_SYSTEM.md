# Design System — Ulilmart POS

Aturan tampilan aplikasi kasir. Prinsip utama: **saat antrean panjang, kasir harus langsung
melihat barang, total, dan tombol Bayar.** Semua yang lain boleh ada, asal tidak bersaing.

Dibuat dengan Tailwind CSS v4. Aturan di bawah sudah diterapkan ke seluruh kode; gunakan untuk
komponen baru.

---

## 1. Warna (5 warna bermakna)

| Peran | Warna | Dipakai untuk |
|---|---|---|
| **Utama / sukses** | `emerald` | Tombol utama (Bayar, Simpan), status berhasil, harga |
| **Peringatan** | `amber` | Stok menipis, perlu perhatian, poin |
| **Bahaya** | `rose` | Hapus, error, kedaluwarsa, retur |
| **Info** | `blue` | Informasi netral, tautan |
| **AI** | `indigo` | Khusus fitur AI (Gemini, saran otomatis) |
| Netral | `slate` | Teks, latar, garis |

Jangan memakai teal, purple, violet, cyan, sky, orange, red, pink, green, dll. — sudah
disatukan ke 5 warna di atas.

**Kontras (WCAG AA):**
- Teks di latar terang: minimal `slate-500` (keterangan), `slate-700`–`900` (isi).
  Jangan `slate-400` di latar putih (2,6:1).
- Teks berwarna di latar terang: `emerald-700`, `rose-600`, `amber-700`, `blue-600`.
- Tombol bertulisan putih: `bg-emerald-700`, `bg-blue-600`, `bg-rose-600`.
  Untuk `bg-emerald-500` pakai teks gelap (`text-slate-950`).
- Garis tepi kolom isian: `border-slate-500` (≥ 3:1).

## 2. Tipografi

| Peran | Ukuran | Kelas |
|---|---|---|
| Total tagihan | 24–30 px | `text-2xl sm:text-3xl font-black` |
| Judul halaman / modal | 18–20 px | `text-lg` / `text-xl font-bold` |
| Harga di kartu produk | 16 px | `text-base font-black` |
| Nama produk, isi keranjang, tombol utama | 14 px | `text-sm` |
| Teks umum, label | 12 px | `text-xs` |
| Keterangan kecil, lencana | 11 px | `text-[11px]` — **ukuran terkecil** |

Angka uang memakai `font-mono` agar sejajar.

## 3. Sudut membulat (4 tingkat)

| Kelas | Untuk |
|---|---|
| `rounded-md` | Lencana kecil, chip, kotak centang |
| `rounded-xl` | Tombol, kolom isian, kartu |
| `rounded-2xl` | Modal, panel besar |
| `rounded-full` | Avatar, titik status, pil |

## 4. Bayangan (3 tingkat)

`shadow-sm` (tombol, kartu) · `shadow-md` (menu tarik-turun) · `shadow-xl` (modal).

## 5. Gerak

- Animasi masuk/keluar singkat (`animate-in fade-in`) dan pemutar loading (`animate-spin`) boleh.
- **Denyut (`animate-pulse`) hanya untuk titik status kecil** (misalnya indikator online).
  Elemen besar yang terus berdenyut mengganggu fokus kasir.

## 6. Ikon

Satu gaya: **lucide-react**. Jangan emoji di tombol, label, atau pilihan dropdown
(pembaca layar membacakan nama emoji).

## 7. Ukuran target sentuh

Minimal 24 px; tombol yang sering ditekan di layar sentuh (jumlah +/−, Bayar) minimal 32–44 px.

## 8. Aksesibilitas komponen

- Tombol ikon wajib `aria-label` ("Tutup", "Hapus", ...).
- Kolom isian wajib terhubung ke label (`<label>` pembungkus, `htmlFor`/`id`, atau `aria-label`).
- Pesan error: `id` + `role="alert"`, kolomnya `aria-invalid` + `aria-describedby`.
- Modal: cukup lapisan `fixed inset-0` berlatar gelap berisi tombol "Tutup" —
  `useGlobalDialogA11y` otomatis menambahkan `role="dialog"`, fokus, dan Escape.
  Layar yang tidak boleh ditutup Escape diberi `data-no-escape`.
- Tombol pilihan/tab: `aria-pressed` atau `aria-selected`.

## 9. Tampilan sesuai jabatan

- **Kasir** melihat: Kasir, Riwayat Nota, scanner, pesanan parkir, kunci layar, panduan.
- **Owner/Supervisor** juga melihat: tombol AI, Server LAN, Backup & Restore, aplikasi desktop,
  pembersihan sistem, promo AI, Pengaturan.
- Informasi bisnis (margin keuntungan) **tidak** ditampilkan di layar kasir kecuali Owner
  mengaktifkannya di Pengaturan → "Tampilan Keranjang Kasir".

## 10. Panel keranjang

Urutan tetap: barang → Subtotal → potongan → **Total** → **Bayar**. Voucher, diskon member, dan
penukaran poin dilipat dalam satu baris "Voucher, Diskon & Poin" (terbuka otomatis saat member
dipilih). Saran AI di keranjang hanya bila diaktifkan di Pengaturan.
