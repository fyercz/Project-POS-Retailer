# Rencana Perbaikan: Auto-Deteksi & Resolusi PATH Node.js/npm pada Semua Skrip .bat

## Latar Belakang Masalah
Pesan kesalahan:
> *"'node' is not recognized as an internal or external command, operable program or batch file"*
> *"'npm' is not recognized as an internal or external command, operable program or batch file"*

terjadi pada sistem operasi Windows ketika Node.js telah diinstal oleh pengguna (biasanya di `C:\Program Files\nodejs`), namun direktori tersebut **belum terdaftar atau belum ter-refresh di variabel environment `%PATH%`** pada sesi Command Prompt yang sedang aktif. Akibatnya, saat skrip `.bat` langsung memanggil perintah `node`, `npm`, atau `where node`, Windows gagal menemukannya dan langsung berhenti.

---

## Rencana Aksi & Arsitektur Solusi

### 1. Auto-Discovery & Path Injection Otomatis di Setiap File `.bat`
Menambahkan blok *Smart Path Resolver* di awal setiap file `.bat` (`autorun.bat`, `run.bat`, `desktop.bat`, `clean.bat`, `install.bat`, `update.bat`):
* Jika perintah `node` atau `npm` belum dikenali secara default:
  * Memeriksa keberadaan file `node.exe` di lokasi instalasi standar Windows:
    1. `C:\Program Files\nodejs\` (Instalasi standar 64-bit)
    2. `C:\Program Files (x86)\nodejs\` (Instalasi 32-bit)
    3. `%LOCALAPPDATA%\Programs\nodejs\` (Instalasi per-user)
    4. `%ProgramW6432%\nodejs\`
    5. Lokasi manajer versi nvm: `%NVM_SYMLINK%`, `C:\nvm\nodejs\`
    6. Direktori npm global: `%APPDATA%\npm`
  * Jika ditemukan di salah satu jalur tersebut, skrip secara otomatis menginjeksi direktori tersebut ke dalam variabel lingkungan `%PATH%` untuk sesi Command Prompt aktif (`set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"`).
  * Dengan demikian, perintah `node`, `npm`, `npx` langsung dapat dieksekusi secara instan tanpa perlu restart komputer atau konfigurasi manual oleh pengguna.

### 2. Auto-Discovery untuk `git` dan `powershell`
Menerapkan logika serupa untuk alat pendukung:
* Mencari `git.exe` di `C:\Program Files\Git\cmd` dan `%LOCALAPPDATA%\Programs\Git\cmd`.
* Memastikan `C:\Windows\System32` dan `WindowsPowerShell\v1.0` selalu ada di `%PATH%` agar perintah bawaan Windows seperti `where`, `powershell`, `chcp`, dan `timeout` tidak gagal dieksekusi.

### 3. Graceful Fallback & Panduan Ramah Pengguna
Jika setelah pengecekan di semua folder default Node.js tetap tidak ditemukan sama sekali:
* Tampilkan pesan peringatan berbahasa Indonesia yang jelas dan informatif.
* Berikan panduan instalasi Node.js LTS (disertai penekanan untuk mencentang opsi *"Add to PATH"*).
* Buka otomatis halaman unduhan resmi `https://nodejs.org/` jika pengguna menyetujui, alih-alih menampilkan error teknis yang membingungkan.

### 4. Skrip Helper Mandiri `perbaiki-path-nodejs.bat` (Opsional / Diagnostic)
Menyediakan skrip diagnostik cepat untuk memeriksa status PATH, versi Node.js, npm, serta Git di komputer kasir, sekaligus mendaftarkan PATH secara permanen ke User Environment Windows jika diinginkan.

---

## Verifikasi & Pengujian
1. Memeriksa kembali sintaks batch semua file (`autorun.bat`, `clean.bat`, `desktop.bat`, `install.bat`, `run.bat`, `update.bat`) dengan pengujian label dan goto.
2. Memastikan fallback ketika `node` tidak ada di PATH default berhasil mengalihkan eksekusi ke `C:\Program Files\nodejs`.
3. Menjalankan linter dan build kompilasi (`compile_applet`) untuk memastikan tidak ada dampak sampingan pada aplikasi utama.
