# Panduan Instalasi, Pembaruan & Pemeliharaan Aplikasi POS

Repositori Resmi GitHub: **[https://github.com/fyercz/Project-POS-Retailer.git](https://github.com/fyercz/Project-POS-Retailer.git)**

Aplikasi **Ulilmart Point of Sales** dilengkapi dengan suite otomatisasi lengkap untuk pemasangan (*auto-install*), pembaruan versi resmi dari GitHub (*auto-update*), verifikasi integritas file (*file integrity verification*), dan pembersihan berkas yang tidak perlu (*system cleanup*) di Windows, Linux, dan macOS.

---

## ⚡ 1-Klik Jalankan Kasir dengan File .EXE (Tanpa CMD & Tanpa Force-Close)

Kini Anda dapat langsung menyalakan terminal kasir menggunakan program biner Windows asli (**`.EXE`**) tanpa perlu membuka Command Prompt (CMD) atau mengatur variabel PATH secara manual:

1. **`UlilmartPOS.exe` (Mode Jendela Kasir Desktop Mandiri)**
   - Cukup **klik ganda (double-click)** file `UlilmartPOS.exe` di folder root aplikasi.
   - Program akan otomatis mendeteksi instalasi Node.js di komputer Anda (memeriksa semua drive `C:`, `D:`, Program Files, AppData, hingga Registry).
   - Server kasir langsung berjalan di latar belakang (tanpa jendela hitam CMD yang mengganggu).
   - Jendela kasir terbuka otomatis menggunakan Microsoft Edge / Google Chrome dalam mode aplikasi mandiri (*frameless app mode*).

2. **`UlilmartPOS-Kiosk.exe` (Mode Layar Penuh / Fullscreen Kiosk)**
   - Khusus untuk terminal kasir toko fisik dan monitor *touchscreen*.
   - Mengunci layar penuh (*kiosk mode*) agar kasir fokus pada transaksi dan antrean pelanggan.

> 💡 **Unduh Langsung dari Web:** Jika Anda mengakses kasir via web, Anda dapat mengunduh file `.exe` ini langsung melalui menu **Aplikasi Desktop** &rarr; **Program Eksekusi Windows Asli (.EXE)** atau via URL:
> - `http://localhost:3000/download/UlilmartPOS.exe`
> - `http://localhost:3000/download/UlilmartPOS-Kiosk.exe`

---

## 🔄 Pembaruan Kode Otomatis & Pemeliharaan Sistem (GitHub Auto-Update)

### Repositori Kode Sumber Resmi:
```text
https://github.com/fyercz/Project-POS-Retailer.git
Branch: main
```

### Cara Melakukan Auto-Update:
1. **Via Antarmuka Aplikasi (1-Klik via Server Kasir)**:
   - Buka menu kasir (klik profil di pojok kanan atas) &rarr; pilih **"Auto-Update GitHub Resmi"**.
   - Sistem akan menampilkan status commit lokal dan commit terbaru di GitHub.
   - Klik tombol **"Tarik Update Sekarang"**. Sistem akan otomatis membersihkan file sementara, menarik pembaruan kode (`git pull origin main`), dan mengompilasi ulang aplikasi (`npm run build`).
   - Seluruh data transaksi, pelanggan, dan katalog produk tersimpan aman 100% di basis data lokal browser (IndexedDB).

2. **Via Script Windows (`update.bat`)**:
   - Cukup klik ganda file **`update.bat`**.
   - Script akan otomatis membersihkan file temporary/log, menghubungkan ke repositori `https://github.com/fyercz/Project-POS-Retailer.git`, menarik kode terbaru, memperbarui dependensi, dan mengompilasi ulang.

3. **Via Script Linux / macOS (`update.sh`)**:
   ```bash
   ./update.sh
   ```

---

## 🛡️ Verifikasi File Sistem & Pemeriksaan Integritas

Aplikasi menyediakan modul diagnostik file untuk memverifikasi keutuhan sistem kasir:
- **Di Aplikasi**: Buka menu pengguna &rarr; **"Verifikasi File & Pembersihan Sistem"** &rarr; tab **"Verifikasi File Sistem"**.
- **Fitur Pemeriksaan**:
  - Memeriksa keberadaan 28 berkas penting (Core Runtime, Source Code UI, Skrip Desktop, PWA, dan Basis Data).
  - Memverifikasi status modifikasi lokal dan mendeteksi berkas yang hilang.
  - Memeriksa kesiapan lingkungan (Node.js runtime, Git CLI, ketersediaan `node_modules`, dan bundle produksi).
  - Memberikan indikator kesehatan sistem (*100% Lengkap & Sehat*).

---

## 🧹 Pembersihan File yang Tidak Perlu pada Sistem (System Cleanup)

Untuk menjaga performa dan kebersihan penyimpanan komputer kasir:
- **Di Aplikasi**: Masuk ke menu **"Verifikasi File & Pembersihan Sistem"** &rarr; tab **"Bersihkan File Sampah"**.
- **Berkas yang Dibersihkan**:
  - File sementara & editor backup (`*.tmp`, `*.temp`, `*.bak`, `*.swp`)
  - Log debugging package manager (`*.log`, `npm-debug.log`)
  - Metadata sampah sistem operasi (`.DS_Store`, `Thumbs.db`, `desktop.ini`)
  - Cache kompilasi pre-bundle usang (`node_modules/.vite`)
- **Keamanan**: Pembersihan beroperasi secara aman dan dilindungi — tidak pernah menyentuh file kode sumber (`src/`), folder Git (`.git`), atau basis data toko (`IndexedDB` / `data/`).

---

## 💻 Pengguna Windows

Hanya ada 4 file yang perlu diketahui:

| File | Fungsi |
|---|---|
| **`MULAI-KASIR.bat`** | Menjalankan kasir. Pertama kali: otomatis menawarkan pasang Node.js bila belum ada, memasang komponen (`npm install`), build, membuat shortcut **Ulilmart POS** di Desktop, dan menawarkan auto-start. |
| **`BERHENTI-KASIR.bat`** | Mematikan server kasir (menutup jendela kasir saja tidak mematikan server). |
| **`update.bat`** | Mengambil versi terbaru dari GitHub. Data toko dicadangkan dulu ke `data-backup\`. |
| **`HAPUS-APLIKASI.bat`** | Menghapus aplikasi (menawarkan cadangan data ke Desktop dulu). |

Pilihan tambahan `MULAI-KASIR.bat` (jalankan dari Command Prompt di folder aplikasi):
```bat
MULAI-KASIR.bat --startup          :: kasir menyala otomatis saat Windows dinyalakan
MULAI-KASIR.bat --remove-startup   :: matikan auto-start
MULAI-KASIR.bat --shortcut         :: buat ulang shortcut di Desktop
```

`autorun.inf` dipakai bila aplikasi dijalankan dari flashdisk: aksi *Open* menjalankan `UlilmartPOS.exe`.

---

## 🐧 Pengguna Linux & macOS

```bash
chmod +x *.sh
./run.sh                     # jalankan kasir (pertama kali: pasang otomatis)
./run.sh --dev               # mode pengembang (hot-reload)
./run.sh --autostart         # nyalakan otomatis saat login (Linux desktop)
./run.sh --remove-autostart  # matikan auto-start
./update.sh                  # ambil versi terbaru (data dicadangkan dulu)
```

Aplikasi otomatis membuka browser ke `http://localhost:3000`.

---

## 🌐 Alternatif Melalui Perintah Node.js (Cross-Platform)

Jika Anda terbiasa menggunakan terminal/command prompt, script launcher universal dapat dijalankan dengan:

```bash
# Auto-Install & Setup
npm run app:install
# atau: node scripts/launcher.mjs install

# Auto-Update
npm run app:update
# atau: node scripts/launcher.mjs update

# Run Aplikasi Kasir
npm run app:run
# atau: node scripts/launcher.mjs run

# Mode Development
node scripts/launcher.mjs dev
```

---

## 🗑️ Menghapus Aplikasi (Uninstall)

**Windows:** klik ganda **`HAPUS-APLIKASI.bat`**. Skrip akan:
1. Mematikan server kasir.
2. Menawarkan cadangan data toko (folder `data`, `data-backup`, dan `.env`) ke Desktop, di folder `Ulilmart-Backup-<waktu>`.
3. Menghapus shortcut Desktop dan auto-start Windows.
4. Menghapus folder aplikasi.

Yang perlu dihapus manual bila diinginkan: data kasir di browser (`edge://settings/siteData` atau `chrome://settings/content/all`, cari `localhost`), aplikasi PWA (`edge://apps`), Node.js (Settings → Apps), dan data situs di HP/kasir lain.

**Linux / macOS:** jalankan `./run.sh --remove-autostart`, lalu hapus folder aplikasi.

---

## ⚙️ Konfigurasi Environment (`.env`)

File `.env` dibuat otomatis saat instalasi. Jika Anda ingin menggunakan fitur AI Copilot dari Google Gemini:
1. Buka file `.env` dengan text editor (Notepad, VS Code, atau nano).
2. Isi nilai `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
3. Simpan file dan restart aplikasi (`BERHENTI-KASIR.bat` lalu `MULAI-KASIR.bat`, atau `./run.sh`).

---

## 🖥️ Menjalankan Sebagai Aplikasi Desktop Mandiri (Desktop App)

Aplikasi POS ini dapat dijalankan sebagai **Aplikasi Desktop Mandiri** (tanpa tab atau address bar browser):

### 1. Peluncur Desktop Windows (1-Klik):
Klik ganda file:
```bat
MULAI-KASIR.bat
```
Aplikasi akan langsung meluncurkan jendela aplikasi desktop tersendiri menggunakan Microsoft Edge / Google Chrome App Window Mode.

### 2. Peluncur Desktop Linux & macOS:
```bash
./run.sh
```

### 3. PWA Desktop Langsung dari Aplikasi:
- Buka aplikasi di browser (Google Chrome / Microsoft Edge).
- Klik tombol **"Desktop"** di pojok kanan atas layar kasir (atau tekan `Alt + D`).
- Klik **"Pasang Sekarang"** untuk membuat ikon aplikasi di Desktop dan Start Menu komputer.

### 4. Mode Native Electron (.EXE / Package):
Berkas Electron sudah tersedia di folder `electron/`:
```bash
# Jalankan jendela Electron:
npm run desktop:electron
```

---

## 📖 Buku Panduan Pengguna & Log Pembaruan (User Manual & Changelog)

1. **Di Dalam Aplikasi (Interaktif)**:
   - Klik tombol **"Panduan"** (ikon buku berwarna emas/oranye) di header atas kasir, atau tekan **`F1`** / **`Alt + H`**.
   - Berisi 6 bab panduan langkah demi langkah, riwayat versi (*changelog*), tanya jawab (*FAQ*), dan daftar tombol pintas keyboard (*shortcuts*).
   - Dilengkapi tombol **"Cetak Panduan"** untuk mencetak lembar SOP kasir toko fisik.

2. **Berkas Dokumentasi Offline**:
   - Silakan baca berkas [`USER_MANUAL.md`](./USER_MANUAL.md) untuk panduan teks lengkap dan riwayat seluruh versi rilis aplikasi.



---

## 🔒 Keamanan & Keamanan Data

- **Data toko tidak lagi disimpan di Git.** Folder `data/` (database SQLite) masuk `.gitignore`. Sebelum "Tarik Update", server otomatis mencadangkan `data/` ke `data-backup/<waktu>/` (5 cadangan terakhir). Tetap disarankan menyalin folder `data/` secara berkala.
- **Fitur administratif** (`/api/system/*` seperti update GitHub dan pembersihan sistem, serta seed database) hanya bisa dipakai dari **komputer server kasir itu sendiri**. Dari perangkat lain di jaringan, set `ADMIN_TOKEN` di file `.env` dan kirim lewat header `X-Admin-Token`.
- **PIN master tersembunyi (`9999`) sudah dihapus.** Gunakan PIN karyawan masing-masing. Ganti PIN bawaan (1234, 2345, 3456, 7890, 9999) di menu Kelola Karyawan sebelum dipakai di toko.
- **Kunci LAN (`LAN_KEY`)**: tanpa kunci, semua perangkat di jaringan toko bisa membaca dan mengubah data kasir. Jika Wi-Fi toko juga dipakai pembeli/tamu, isi `LAN_KEY` di file `.env`, lalu pasangkan tiap HP/kasir lain sekali lewat link pairing di menu **Server LAN** pada komputer server. Halaman QR rak untuk pembeli tetap bisa dibuka tanpa kunci, dan tidak lagi menampilkan harga modal.
- Hanya aplikasi kasir (port 3000) di jaringan lokal yang boleh memanggil API; halaman web lain di jaringan (mis. panel router) ditolak. Tambahan origin bisa didaftarkan lewat `ALLOWED_ORIGINS`.
- Endpoint AI dibatasi lajunya per perangkat untuk melindungi kuota Gemini.
- Menjalankan tes: `npm test`.
