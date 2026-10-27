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
disatukan ke 5 warna di atas. Warna hex yang ditulis langsung (templat cetak, grafik, label QR)
juga wajib diambil dari palet yang sama; satu-satunya pengecualian adalah logo merek.

**Kontras (WCAG AA):**
- Teks di latar terang: minimal `slate-500` (keterangan), `slate-700`–`900` (isi).
  Jangan `slate-400` di latar putih (2,6:1).
- Teks berwarna di latar terang: `emerald-700`, `rose-600`, `amber-700`, `blue-600`.
- Tombol bertulisan putih: `bg-emerald-700`, `bg-blue-600`, `bg-rose-600`.
  Untuk `bg-emerald-500` pakai teks gelap (`text-slate-950`).
- **Hover tombol bertulisan putih menjadi lebih GELAP** (`hover:bg-emerald-800`, `hover:bg-rose-700`),
  bukan lebih terang. `hover:bg-emerald-500` dengan tulisan putih hanya 2,5:1 (audit 2026-10-26
  menemukan 53 tombol seperti ini).
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

Satu gaya: **lucide-react**. Jangan emoji di tombol, label, pilihan dropdown, judul kolom, menu,
atau notifikasi — termasuk teks yang dibentuk lewat kode (pembaca layar membacakan nama emoji).
Emoji boleh di **isi** pesan WhatsApp, teks yang disalin/dibagikan, dan templat cetak.

## 7. Ukuran target sentuh

Minimal 24 px; tombol yang sering ditekan di layar sentuh (jumlah +/−, Bayar) minimal 32–44 px.

## 8. Aksesibilitas komponen

- Tombol ikon wajib `aria-label` ("Tutup", "Hapus", ...).
- Kolom isian wajib terhubung ke label (`<label>` pembungkus, `htmlFor`/`id`, atau `aria-label`).
- Pesan error: `id` + `role="alert"`, kolomnya `aria-invalid` + `aria-describedby`.
- Modal: lapisan latar standar `fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs` (jendela di
  atas jendela lain: `z-60`). Satu-satunya pengecualian: layar kunci (`data-overlay="lock"`,
  lebih gelap). Isi dengan tombol "Tutup" (atau tombol berteks Tutup/Batal/Kembali) —
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

Urutan tetap: barang → Subtotal → potongan → **Total** → **Bayar**. Member, voucher, diskon
member, dan penukaran poin dilipat dalam satu baris **"Member, Voucher & Poin"** (menampilkan nama
member bila dipilih; terbuka otomatis saat member dipilih). Saran AI di keranjang hanya bila diaktifkan di Pengaturan.

## 11. Komponen bersama (`src/components/ui`)

Komponen baru **wajib** memakai komponen ini; komponen lama dipindahkan bertahap saat disentuh.
Contoh acuan: `PriceUpdateFromFileModal.tsx`.

| Komponen | Pakai untuk | Catatan |
|---|---|---|
| `Button` variant `primary` | Aksi utama (Bayar, Simpan, Terapkan) | emerald-700, hover emerald-800, tulisan putih |
| `Button` variant `secondary` | Batal, Tutup, aksi pendamping | Bergaris slate |
| `Button` variant `danger` | Hapus, Void, tindakan merusak | rose-600, hover rose-700 |
| `Button` variant `ghost` | Aksi ringan di dalam tabel/daftar | Tanpa latar |
| `ModalShell` | Semua jendela | Judul, tombol "Tutup", isi bergulir, kaki. **Jangan** menambah `role="dialog"` sendiri (dialog ganda) |
| `Field` + `inputClass` | Kolom isian | Label, keterangan, pesan galat; `aria-invalid`/`aria-describedby` otomatis |
| `StatusText` | Pesan hasil / peringatan | success/info/muted → `role="status"`; warning/danger → `role="alert"` |

Satu aksi utama per jendela. Urutan kaki: `secondary` (Batal) lalu `primary` di kanan.

## 12. Pola

**Otorisasi PIN atasan** (`AuthorityModal`): tindakan berisiko oleh jabatan yang tidak berhak
(void, retur uang) membuka jendela PIN Supervisor/Owner **sebelum** jendela tindakannya. Nama
penyetuju dicatat. Fungsi di belakangnya juga menolak tanpa otorisasi (bukan hanya tombolnya).

**Pratinjau sebelum terapkan** (impor, perbarui harga dari file, stock opname CSV): baca berkas →
ringkasan (berubah / sama / tidak ditemukan / tidak valid) → tabel dengan centang per baris dan
peringatan → tombol primary "Terapkan N …" yang menyebut jumlahnya. Tidak ada yang berubah sebelum
tombol itu ditekan.

**Peringatan dalam baris** (mis. margin saat terima barang): teks kecil `text-[11px]` tepat di
bawah kolom terkait; merah = rugi/bahaya (`role="alert"`), kuning = perlu perhatian, abu = aman.
Bila ada peringatan, ringkasannya muncul lagi setelah tindakan selesai, lengkap dengan aksi
perbaikan langsung (mis. "Simpan Harga Jual Baru").

**Konfirmasi tindakan merusak**: tindakan yang menimpa/menghapus banyak data (restore backup, hapus
data impor, hapus transaksi uji coba) memakai jendela konfirmasi yang menyebut jumlahnya; restore
yang menimpa data wajib kotak centang persetujuan sebelum tombolnya aktif.

**Pesan hasil**: setelah tindakan, tampilkan `StatusText` (mis. "2 harga diperbarui dan dicatat di
Riwayat Harga") — sebutkan angka & di mana hasilnya bisa dilihat.

## 13. Pemeriksaan otomatis

`tests/designSystem.test.ts` (11 aturan) dijalankan CI di setiap perubahan dan gagal bila ada:
tulisan putih di atas emerald-400/500 (termasuk hover), kelas warna di luar palet, **warna hex di
luar palet**, teks slate-400 di latar terang, huruf < 11 px, sudut/bayangan di luar tingkat yang
diizinkan, `animate-pulse` pada elemen besar, emoji di teks antarmuka (JSX **maupun** string
label/notifikasi), atau **lapisan jendela yang tidak standar**.

`e2e/kontras-hover.spec.ts` menyorot setiap tombol berwarna di layar kasir, jendela pembayaran,
Pengaturan, dan formulir produk, lalu memeriksa kontrasnya dengan axe **dalam keadaan tersorot**
(pemeriksaan axe biasa hanya melihat keadaan diam).
