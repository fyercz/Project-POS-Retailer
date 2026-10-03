# 📖 Buku Panduan Pengguna & Dokumentasi Fitur Aplikasi POS
**Versi Sistem:** v2.6.5  
**Tanggal Pembaruan:** September 2026  
**Aplikasi:** Ulilmart Point of Sales (POS)

---

## 🌟 Daftar Isi
1. [Ringkasan Aplikasi & Arsitektur](#1-ringkasan-aplikasi--arsitektur)
2. [Panduan Operasional Kasir & Transaksi](#2-panduan-operasional-kasir--transaksi)
3. [Manajemen Katalog Produk & Inventaris](#3-manajemen-katalog-produk--inventaris)
4. [Supplier & AI Invoice Scanner](#4-supplier--ai-invoice-scanner)
5. [Shift Kasir & Pengelolaan Kas Laci](#5-shift-kasir--pengelolaan-kas-laci)
6. [Pusat Cadangan & Pemulihan (Backup & Restore)](#6-pusat-cadangan--pemulihan-backup--restore)
7. [Server Database Multi-Client LAN (Multi-Kasir Toko)](#7-server-database-multi-client-lan-multi-kasir-toko)
8. [Mode Desktop Mandiri & Multi-Device (HP/LAN)](#8-mode-desktop-mandiri--multi-device-hplan)
9. [Tabel Pintasan Keyboard (Hotkeys Kasir)](#9-tabel-pintasan-keyboard-hotkeys-kasir)
10. [Log Pembaruan & Fitur Baru (Changelog)](#10-log-pembaruan--fitur-baru-changelog)
11. [Panduan Pembaruan Aplikasi (Auto-Update)](#11-panduan-pembaruan-aplikasi-auto-update)

---

## 1. Ringkasan Aplikasi & Arsitektur
Ulilmart POS adalah sistem kasir ritel modern dan toko kelontong/minimarket yang dirancang dengan prinsip **Offline-First**, **Kecepatan Transaksi Cepat**, dan **Kemudahan Multi-Platform**.

* **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons.
* **Backend:** Node.js Express Server (`server.ts`) port 3000.
* **Penyimpanan & Database:** Basis Data Relasional Sejati SQLite WAL Mode (`data/pos-master.sqlite`) di Server Backend Pusat dengan jaminan transaksi ACID & Write-Ahead Logging; serta IndexedDB Client Storage di browser kasir untuk operasi offline tanpa henti.
* **Sinkronisasi Otomatis Berkala:** Scheduler background sync periodik (default tiap 15 detik, dapat diatur 10s hingga 5m) yang otomatis mendorong transaksi kasir dan memeriksa status server pusat.
* **Kecerdasan Buatan:** Google Gemini AI untuk asisten toko, OCR faktur belanja distributor, dan hitung stok rak visual.

---

## 2. Panduan Operasional Kasir & Transaksi

### 2.1 Memulai Transaksi Baru
1. Tekan tombol **`F2`** pada keyboard untuk mengarahkan kursor langsung ke bilah pencarian produk.
2. Ketik nama barang, kode SKU, atau scan barcode kemasan barang menggunakan scanner barcode USB/Bluetooth.
3. Untuk menggunakan kamera laptop/HP sebagai scanner, tekan **`F3`**.
4. Barang akan otomatis ditambahkan ke keranjang belanja di sisi kanan.
5. Klik tanda **`+`** atau **`-`** untuk mengubah jumlah kuantitas.

### 2.2 Memarkir Pesanan (Hold Order - F4)
Jika pelanggan lupa mengambil barang tambahan di lorong toko:
1. Tekan tombol **`F4`** atau klik **"Parkir Order"**.
2. Berikan catatan pengingat (misal: *"Pak Budi - Ambil Minyak"*).
3. Keranjang belanja akan disimpan dan kasir siap melayani pelanggan berikutnya di antrean.
4. Saat pelanggan kembali, klik **"Pesanan Diparkir"** di atas keranjang dan pilih **"Pulihkan"**.

### 2.3 Pembayaran & Cetak Struk (Checkout - F9)
1. Tekan tombol **`F9`** atau klik tombol hijau **"Bayar Sekarang"**.
2. Pilih metode pembayaran:
   * **Tunai (Cash):** Masukkan uang pelanggan. Sistem otomatis menghitung kembalian uang pas.
   * **QRIS EDC BRI:** Pembayaran QRIS diproses langsung via mesin EDC BRI toko (tanpa gateway online eksternal). Kasir memilih menu QRIS pada mesin EDC BRI, pembeli scan QRIS di layar/struk EDC BRI (BRImo, BCA, GoPay, OVO, Dana, ShopeePay, dll). Setelah struk EDC keluar approved, kasir dapat memasukkan No. Referensi / RRN EDC untuk rekonsiliasi settlement.
   * **Kartu EDC BRI (Debit / Kredit):** Pembayaran kartu diproses langsung via mesin EDC BRI toko dengan alur yang sama seperti QRIS (Dip Chip, Gesek Swipe, atau Tap Contactless), nasabah memasukkan 6 digit PIN kartu pada mesin EDC BRI, dan kasir mencatat No. Approval / RRN EDC serta batch struk untuk rekonsiliasi settlement.
3. Klik **"Selesaikan Pembayaran"**.
4. Transaksi otomatis dicatat ke modul **Laporan Pembayaran & Settlement EDC BRI** untuk memudahkan pencocokan struk settlement fisik harian saat tutup toko/shift.
5. Struk thermal otomatis disiapkan (ukuran 58mm atau 80mm) memuat rincian metode pembayaran dan kode referensi EDC.

### 2.4 Pendaftaran Cepat Barcode Belum Terdaftar (Otoritas Supervisor / Owner)
Jika saat transaksi kasir memindai barcode barang fisik yang belum ada di database:
1. Sistem otomatis menampilkan jendela konfirmasi **"Barcode Belum Terdaftar"** dengan kode barcode yang baru saja dipindai.
2. **Aturan Hak Akses (RBAC):**
   * **Kasir Frontliner:** Membutuhkan PIN otorisasi Supervisor / Owner untuk mencegah pendaftaran barang atau pengubahan harga tanpa persetujuan. Masukkan 4-digit PIN pejabat yang berwenang (misal: Supervisor `7890` atau Owner `9999`).
   * **Supervisor / Owner / Inventory:** Jika akun yang sedang login sudah memiliki hak akses di atas kasir, tombol **"Tambah Produk Sekarang"** langsung aktif tanpa perlu memasukkan PIN ulang.
3. Klik **"Verifikasi & Tambah Produk"**.
4. Formulir pendaftaran produk baru terbuka dengan kode barcode yang sudah terisi otomatis *(pre-filled)*.
5. Anda dapat mengklik tombol **"Cari di Database Online"** untuk mengisi nama produk, merek, dan kategori secara otomatis dari internet, atau mengetik nama dan harga secara manual.
6. Klik **"Simpan Produk"**.
7. **Otomatis Masuk Keranjang:** Produk baru langsung tersimpan ke master data toko dan otomatis dimasukkan ke keranjang kasir tanpa perlu scan ulang.

---

## 3. Manajemen Katalog Produk & Inventaris

### 3.1 Menambah & Mengubah Produk
1. Buka menu **"Katalog Produk"** di navigasi utama.
2. Klik tombol **"+ Tambah Produk Baru"**.
3. Isi data wajib: Nama Produk, Barcode/SKU, Kategori, Harga Beli (Modal), dan Harga Jual.
4. Atur batas **Stok Minimum** agar sistem otomatis memunculkan peringatan kuning/merah saat stok hampir habis.

### 3.2 Visual Stock Opname Berbasis AI
1. Buka menu **"Stok Opname"** &rarr; **"Visual AI Opname"**.
2. Arahkan kamera HP atau webcam ke rak barang toko.
3. AI Gemini akan mendeteksi dan menghitung jumlah produk yang terpajang.
4. Tinjau hasil hitungan dan klik **"Terapkan Penyesuaian Stok"**.

---

## 4. Supplier & AI Invoice Scanner
1. Buka menu **"Pemasok & Pengadaan"**.
2. Pilih fitur **"Scan Faktur AI"**.
3. Ambil foto kertas surat jalan / faktur tagihan dari distributor.
4. AI Gemini membaca otomatis nama barang, kuantitas masuk, harga modal baru, dan total faktur.
5. Klik konfirmasi untuk langsung menambah stok ke gudang toko.

---

## 5. Shift Kasir & Pengelolaan Kas Laci

### 5.1 Buka Shift Kasir
Setiap kali kasir mulai bertugas:
1. Klik menu **"Shift Kasir"** &rarr; **"Buka Shift Baru"**.
2. Hitung uang kembalian di laci kasir dan masukkan sebagai **Modal Awal (Starting Cash)**.

### 5.2 Kas Masuk & Kas Keluar Operasional
Jika selama jam kerja ada pengeluaran uang laci (misal: bayar kurir sampah, beli kantong kresek):
1. Klik **"Kas Keluar"**.
2. Masukkan nominal uang dan keterangan alasan pengeluaran.

### 5.3 Tutup Shift Kasir (Z-Report)
1. Di akhir jam kerja kasir, klik **"Tutup Shift"**.
2. Hitung seluruh uang fisik di laci kasir dan masukkan nominalnya.
3. Sistem menghitung selisih (Kurang/Lebih).
4. Cetak laporan penutupan shift kasir.
5. Tekan **`Alt + L`** untuk mengunci layar kasir dengan PIN otorisasi.

---

## 6. Pusat Cadangan & Pemulihan (Backup & Restore)

### 6.1 Membuat Berkas Cadangan (Backup JSON)
* Tekan tombol **`F9`** atau klik tombol **"Backup & Restore"** di header atas.
* Pilih tab **"Buat Cadangan"** dan klik **"Unduh Berkas Cadangan (.json)"**.
* Simpan berkas ini ke Flashdisk atau Google Drive setiap hari setelah toko tutup.

### 6.2 Titik Pemulihan Instan (Restore Points)
* Sebelum melakukan perubahan besar (misal impor ribuan data atau promo diskon massal), buat **Snapshot Baru** di tab *Titik Pemulihan*.
* Jika ada kekeliruan, Anda bisa kembali ke kondisi snapshot tersebut dalam 1 detik tanpa file eksternal.

### 6.3 Memulihkan Data (Restore File) dengan Proteksi Keamanan
1. Buka tab **"Pulihkan dari Berkas"** dan unggah berkas `.json` cadangan.
2. Sistem akan memverifikasi integritas file.
3. Dialog peringatan **"Are You Sure? / Data Saat Ini Akan Ditimpa"** akan muncul.
4. Anda harus mencentang persetujuan konfirmasi:
   `[✓] Saya yakin dan memahami bahwa data yang ada saat ini akan ditimpa.`
5. Klik tombol merah **"Ya, Saya Yakin — Timpa & Pulihkan Data"**.

---

## 7. Server Database Multi-Client LAN (Multi-Kasir Toko)

Fitur ini memungkinkan toko mengoperasikan banyak kasir sekaligus (PC Kasir 1, Laptop Kasir 2, Tablet Kasir 3, HP Owner) dalam 1 jaringan Wi-Fi/LAN lokal toko **tanpa membutuhkan koneksi internet**.

### 7.1 Konsep Arsitektur Server LAN
* **Server Master (Host):** Dijalankan pada 1 komputer utama toko (misal PC Kasir 1). Komputer ini mengelola database master, pencatatan transaksi terpusat, dan otomatis mendepresiasi stok produk.
* **Terminal Klien:** Dijalankan pada kasir tambahan (Laptop Kasir 2, Tablet, HP). Terminal klien terhubung ke IP Server Master melalui port 3000.
* **Stok Sinkron:** Setiap transaksi di kasir manapun akan seketika memotong stok di Server Master dan mendistribusikan stok terbaru ke seluruh kasir lain.
* **Parkir Pesanan Bersama (Shared Order Parking):** Kasir 1 dapat memarkir pesanan (F4), dan Kasir 2 dapat langsung menarik dan menyelesaikan pembayaran tanpa input ulang.

### 7.2 Cara Penggunaan
1. Buka menu **Server LAN** di bilah atas aplikasi atau tekan tombol pintasan **`Alt + N`**.
2. **Pada PC Kasir 1 (Master):** Pilih peran **"Server Master (Host)"**. Catat alamat URL LAN yang ditampilkan (misal: `http://192.168.1.100:3000`).
3. **Pada Kasir Tambahan (Laptop / HP):** 
   * Buka browser dan ketik alamat URL LAN Server Master.
   * Buka menu Server LAN (`Alt + N`), pilih peran **"Terminal Klien"**, dan masukkan URL Server.
   * Klik tombol **"Ping Koneksi"** untuk memastikan tersambung (lampu indikator hijau).
   * Klik **"Tarik Seluruh Katalog dari Server Master"** untuk menduplikasi barang toko.
4. Semua transaksi antar-kasir kini tersinkronisasi secara real-time!

---

## 8. Mode Desktop Mandiri & Multi-Device (HP/LAN)

### 8.1 Menjalankan sebagai Aplikasi Desktop di Komputer Kasir
* **Windows:** Klik ganda file `desktop.bat`.
* **Linux / macOS:** Jalankan perintah `./desktop.sh`.
* POS akan terbuka dalam jendela desktop aplikasi mandiri tanpa URL bar dan tab browser.
* Tekan **`F11`** untuk masuk ke **Mode Kiosk Layar Penuh**.

### 8.2 Menghubungkan Handphone (Android / iPhone) dalam 1 Jaringan Wi-Fi
1. Hubungkan HP dan Komputer Kasir ke Wi-Fi toko yang sama.
2. Cek alamat IP komputer kasir (contoh: `192.168.1.15`).
3. Buka browser di HP (Chrome / Safari) dan ketik:
   `http://192.168.1.15:3000`
4. Pilih **"Add to Home Screen"** untuk memasang ikon aplikasi di layar utama HP.

---

## 9. Tabel Pintasan Keyboard (Hotkeys Kasir)

| Tombol Pintasan | Fungsi |
| :--- | :--- |
| **`F1`** / **`Alt + H`** | Membuka Buku Panduan Pengguna & Manual Aplikasi |
| **`Alt + N`** | Membuka Pusat Server Database Multi-Client LAN |
| **`F2`** | Fokus langsung ke Pencarian Produk / Input Barcode |
| **`F3`** | Membuka Scanner Barcode Kamera (Auto Add to Cart) |
| **`F4`** | Memarkir Pesanan Sementara (Hold Order) |
| **`F9`** | Membuka Pusat Cadangan & Pemulihan (Backup & Restore) |
| **`F11`** | Mode Kiosk Layar Penuh (Fullscreen) |
| **`Alt + L`** | Kunci Layar Kasir (Lock Screen PIN) |
| **`Alt + D`** | Buka Pusat Aplikasi Desktop & Hardware Kiosk |
| **`Alt + G`** | Buka Asisten Cerdas (Gemini Retail Copilot) |
| **`Alt + T`** | Ganti Tema Gelap / Terang (Dark / Light Mode) |
| **`Esc`** | Menutup modal atau jendela popup yang sedang aktif |

---

## 10. Log Pembaruan & Fitur Baru (Changelog)

### Versi v2.6.5 (September 2026) — *Versi Terkini*
* **Prompt Tambah Produk Barcode Belum Terdaftar:** Penanganan cerdas saat kasir memindai barcode barang yang belum terdaftar di database master toko.
* **Otoritas Di Atas Kasir (Supervisor / Owner RBAC):** Kasir tidak dapat menambahkan barang sendiri; memerlukan persetujuan dan verifikasi 4-digit PIN Supervisor (`7890`) atau Owner (`9999`).
* **Persetujuan Langsung 1-Klik:** Akun aktif Supervisor/Owner/Inventory dapat langsung menyetujui tanpa input PIN ulang.
* **Otomatisasi Alur Transaksi Kasir:** Barcode otomatis terisi, dukungan pencarian info produk online (AI Enrichment), dan produk baru otomatis langsung masuk ke keranjang nota kasir yang sedang berjalan.

### Versi v2.7.0 (September 2026)
* **Sinkronisasi Otomatis Berkala ke Server Pusat:** Fitur otomatisasi background sync periodik (tiap 10s, 15s, 30s, 1m, 2m, atau 5m) yang otomatis mengunggah transaksi kasir dan memeriksa status server tanpa membebani interaksi kasir.
* **Basis Data Relasional SQLite WAL Mode (`pos-master.sqlite`):** Backend Express ditenagai basis data relasional sejati SQLite dengan mode *Write-Ahead Logging* (WAL). Memberikan integritas transaksi ACID, multi-kasir non-blocking reads/writes, skema tabel terindeks (`products`, `transactions`, `transaction_items`, `customers`, `suppliers`, `held_orders`, `sync_audit_logs`), serta relasi foreign keys on delete cascade.
* **Pemeriksaan Integritas Database Real-Time (`PRAGMA integrity_check`):** Pengelola toko dapat memverifikasi kesehatan basis data SQLite dan struktur B-tree secara langsung dari antarmuka kasir.
* **Penyelarasan Kartu EDC BRI dengan QRIS & Penghapusan Transfer:** Metode pembayaran kartu debit/kredit kini seragam dengan SOP mesin EDC BRI fisik toko, dan opsi transfer bank yang tidak relevan telah dibersihkan.

### Versi v2.6.4 (September 2026)
* **Pusat Auto-Update Terintegrasi dari GitHub:** Tab baru di Pusat Desktop (`Alt + D`) untuk memantau commit dan melakukan `git pull` 1-klik.
* **Skrip Pembaruan Windows (`update.bat`):** Pembaruan otomatis dari luar browser tanpa kehilangan data IndexedDB.

### Versi v2.5.0 (September 2026)
* **Server Database Multi-Client LAN (`Alt + N`):** Kemampuan mengoperasikan banyak kasir terhubung secara simultan (PC, laptop, tablet, HP) dalam 1 jaringan toko tanpa internet.
* **Sinkronisasi Stok Real-Time:** Penjualan di kasir manapun otomatis memotong stok di Server Master dan kasir lainnya secara otomatis.
* **Shared Order Parking (Parkir Pesanan Antar-Kasir):** Pemindahan antrean belanja pelanggan dari Kasir 1 ke Kasir 2 tanpa perlu scan ulang barang.
* **Penyimpanan Database File Persisten (`/data/lan-database.json`):** Database master disimpan dengan mekanisme debounced safe-write untuk menjaga integritas data.
* **QR Code Koneksi Cepat:** Tampilan QR Code di layar PC Master untuk menghubungkan HP/Tablet kasir cukup dengan kamera.

### Versi v2.4.0 (September 2026)
* **Buku Panduan & Dokumentasi Interaktif (User Manual):** Akses langsung panduan fitur, FAQ, dan shortcut keyboard di dalam aplikasi (tombol Panduan atau tekan `F1`).
* **Peluncur Desktop 1-Klik (`desktop.bat` & `desktop.sh`):** Menjalankan aplikasi dalam jendela desktop mandiri tanpa address bar browser.
* **Proteksi Konfirmasi Restore ("Are you sure?"):** Dialog verifikasi visual dengan checkbox persetujuan wajib sebelum menimpa database.
* **Pusat Kontrol Desktop Hub (`Alt + D`):** Pengujian cetak struk thermal, perintah buka laci uang (*Cash Drawer Kick*), dan panduan *Silent Printing*.
* **Konfigurasi Native Electron (`electron/main.cjs`):** Fondasi paket instalasi desktop `.exe`.

### Versi v2.3.0 (September 2026)
* **Pusat Backup & Restore Point (F9):** Pembuatan snapshot titik pemulihan darurat otomatis.
* **Validasi Integritas JSON:** Pengecekan skema sebelum eksekusi pemulihan data.

### Versi v2.2.0 (September 2026)
* **Gemini Retail Copilot (Alt+G):** Asisten AI untuk analisis stok dan tren penjualan.
* **AI Invoice Scanner:** Ekstraksi otomatis faktur belanja distributor via foto kamera.
* **Visual Stock Opname AI:** Perhitungan otomatis jumlah barang di etalase rak toko.

### Versi v2.1.0 (September 2026)
* **Arsitektur Offline-First (IndexedDB):** Kasir beroperasi lancar tanpa koneksi internet.
* **Manajemen Shift Kasir & Uang Laci:** Modal awal, kas masuk/keluar, dan laporan Z-Report.
* **Kunci Layar Kasir (Alt+L):** Proteksi PIN kasir saat istirahat atau ganti shift.

---

## 10. Panduan Pembaruan Aplikasi, Verifikasi File & Pemeliharaan Sistem

Aplikasi kasir Ulilmart POS mendukung pembaruan kode otomatis langsung dari repositori GitHub resmi, verifikasi integritas file sistem, dan pembersihan file sampah yang tidak perlu.

### 📌 Repositori Resmi GitHub
* **URL:** `https://github.com/fyercz/Project-POS-Retailer.git`
* **Branch Utama:** `main`

### 🛡️ Jaminan Keamanan Data Toko
Seluruh database riwayat penjualan, transaksi kasir, katalog produk, stok opname, data supplier, dan pengaturan toko tersimpan secara permanen di **IndexedDB lokal browser**. Melakukan update kode dari GitHub, verifikasi file, atau pembersihan cache **100% AMAN dan TIDAK AKAN MENGHAPUS ATAU MERESET DATA TOKO**.

### Metode 1: Pembaruan 1-Klik dari Dalam Aplikasi (UI)
1. Buka menu pengguna di pojok kanan atas atau klik tombol Desktop (atau tekan pintasan keyboard **`Alt + D`**).
2. Pilih tab **"Auto-Update GitHub"** (ikon cabang Git hijau).
3. Status repositori resmi (`https://github.com/fyercz/Project-POS-Retailer.git`), commit lokal, dan commit terbaru di GitHub akan tampil secara otomatis.
4. Klik tombol hijau **"Tarik Update Sekarang"**. Sistem akan otomatis membersihkan file sementara, menjalankan `git pull origin main`, dan mengompilasi ulang aplikasi (`npm run build`).

### Metode 2: Verifikasi Integritas File Sistem
1. Pada menu Pusat Aplikasi Desktop & Pemeliharaan Sistem, klik tab **"Verifikasi File Sistem"**.
2. Sistem akan memindai seluruh 28 file kritis (Core Runtime, Source Code, Skrip Desktop, PWA, dan Basis Data).
3. Anda dapat melihat file mana yang utuh, dimodifikasi secara lokal, atau hilang, beserta status kesehatan sistem (*Overall Health*).

### Metode 3: Pembersihan File yang Tidak Perlu (System Cleanup)
1. Pada menu pemeliharaan, buka tab **"Bersihkan File Sampah"**.
2. Klik tombol **"Pindai Sampah"** untuk mendeteksi file residu seperti `.tmp`, `*.bak`, `*.log`, `Thumbs.db`, `.DS_Store`, dan cache Vite yang usang.
3. Klik **"Bersihkan File Sekarang"** untuk menghapus file-file tidak perlu tersebut secara aman dan membebaskan ruang penyimpanan komputer kasir.

### Metode 4: Menggunakan File Skrip Windows (`update.bat`)
1. Klik ganda file **`update.bat`** di dalam folder aplikasi kasir Anda (atau unduh langsung dari tab Update di `Alt + D`).
2. Skrip otomatis membersihkan file sampah, menghubungkan ke repositori resmi `https://github.com/fyercz/Project-POS-Retailer.git`, menarik kode terbaru, memperbarui paket dependensi, dan mengompilasi ulang aplikasi.
3. Setelah selesai, tekan tombol `Y` untuk langsung menyalakan kembali aplikasi kasir desktop.

### Metode 5: Perintah Terminal Manual
Jika Anda lebih terbiasa dengan baris perintah (Command Prompt / PowerShell / Terminal Linux & Mac):
```bash
# Opsi A: Skrip terintegrasi launcher
npm run app:update

# Opsi B: Perintah manual Git & Build dari repositori resmi
git remote set-url origin https://github.com/fyercz/Project-POS-Retailer.git
git pull origin main && npm install && npm run build

# Opsi C: Skrip shell Linux / macOS
./update.sh
```
