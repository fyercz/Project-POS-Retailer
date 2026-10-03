# Panduan Instalasi, Pembaruan & Pemeliharaan Aplikasi POS

Repositori Resmi GitHub: **[https://github.com/fyercz/Project-POS-Retailer.git](https://github.com/fyercz/Project-POS-Retailer.git)**

Aplikasi **Ulilmart Point of Sales** dilengkapi dengan suite otomatisasi lengkap untuk pemasangan (*auto-install*), pembaruan versi resmi dari GitHub (*auto-update*), verifikasi integritas file (*file integrity verification*), dan pembersihan berkas yang tidak perlu (*system cleanup*) di Windows, Linux, dan macOS.

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

## 🚀 Fitur Autorun & Auto-Start (1-Klik Tanpa Setup Rumit)

Aplikasi telah dilengkapi suite **Autorun** lengkap untuk mempermudah operasional kasir harian dan media installer (USB Flashdisk / CD):

### 1. `autorun.bat` (Universal Auto-Runner Windows)
Cukup klik ganda **`autorun.bat`**:
- Otomatis mendeteksi Node.js (memberi panduan unduh jika belum ada).
- Otomatis membuat `.env` jika belum tersedia.
- Otomatis menginstal package jika `node_modules` belum ada (`npm install`).
- Otomatis melakukan build produksi jika `dist` belum ada (`npm run build`).
- Langsung membuka jendela aplikasi kasir (*Desktop App Window*) siap pakai.

### 2. `autorun.inf` (Untuk Flashdisk / Media Penyimpanan Eksternal)
- Berkas autorun standar Windows saat flashdisk atau installer dicolokkan ke PC.
- Mengarahkan aksi *Open* langsung ke `autorun.bat`.

### 3. `setup-autorun-startup.bat` (Otomatis Buka Kasir Saat Komputer Dinyalakan)
Ingin agar PC kasir langsung membuka aplikasi kasir setiap kali komputer dinyalakan di pagi hari?
- Klik ganda **`setup-autorun-startup.bat`**.
- Tekan **`1`** untuk mendaftarkan Ulilmart POS ke folder **Windows Startup**.
- Tekan **`3`** untuk membuat shortcut ikon kasir langsung di layar Desktop kasir.
- Tekan **`2`** jika sewaktu-waktu ingin menonaktifkan auto-start.

### 4. `autorun.sh` (Auto-Runner Linux / Raspberry Pi / macOS)
Jalankan di terminal:
```bash
./autorun.sh
```
Atau untuk mendaftarkan auto-start saat login di Linux desktop (GNOME/XFCE/Raspberry Pi OS):
```bash
./autorun.sh --autostart
```

---

## 💻 Pengguna Windows

### 1. Instalasi Pertama Kali (Auto-Install)
- Pastikan komputer sudah terpasang [Node.js](https://nodejs.org/) (versi LTS direkomendasikan).
- Klik ganda (double-click) file:
  ```bat
  install.bat
  ```
  Script akan otomatis:
  - Memeriksa Node.js & npm
  - Membuat file `.env` dari `.env.example`
  - Menginstal seluruh dependensi (`npm install`)
  - Mengompilasi aplikasi untuk mode produksi (`npm run build`)

### 2. Menjalankan Aplikasi Kasir
- Cukup klik ganda file:
  ```bat
  run.bat
  ```
- Browser akan terbuka otomatis menuju `http://localhost:3000`.

### 3. Pembaruan Aplikasi (Auto-Update)
- Jika ada update kode terbaru (misalnya dari Git), klik ganda file:
  ```bat
  update.bat
  ```
  Script akan menarik kode terbaru, memperbarui dependensi, dan melakukan build ulang secara otomatis.

---

## 🐧 Pengguna Linux & macOS

Sebelum menjalankan pertama kali, pastikan script memiliki izin eksekusi:
```bash
chmod +x *.sh
```

### 1. Instalasi Pertama Kali (Auto-Install)
Jalankan di terminal:
```bash
./install.sh
```

### 2. Menjalankan Aplikasi
- **Mode Kasir Produksi (Direkomendasikan):**
  ```bash
  ./run.sh
  ```
- **Mode Pengembang (Development / Hot-Reload):**
  ```bash
  ./run.sh --dev
  ```

Aplikasi akan otomatis membuka browser ke alamat `http://localhost:3000`.

### 3. Pembaruan Aplikasi (Auto-Update)
Jalankan di terminal:
```bash
./update.sh
```

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

## ⚙️ Konfigurasi Environment (`.env`)

File `.env` dibuat otomatis saat instalasi. Jika Anda ingin menggunakan fitur AI Copilot dari Google Gemini:
1. Buka file `.env` dengan text editor (Notepad, VS Code, atau nano).
2. Isi nilai `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
3. Simpan file dan restart aplikasi (`run.bat` atau `./run.sh`).

---

## 🖥️ Menjalankan Sebagai Aplikasi Desktop Mandiri (Desktop App)

Aplikasi POS ini dapat dijalankan sebagai **Aplikasi Desktop Mandiri** (tanpa tab atau address bar browser):

### 1. Peluncur Desktop Windows (1-Klik):
Klik ganda file:
```bat
desktop.bat
```
Aplikasi akan langsung meluncurkan jendela aplikasi desktop tersendiri menggunakan Microsoft Edge / Google Chrome App Window Mode.

### 2. Peluncur Desktop Linux & macOS:
```bash
./desktop.sh
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


