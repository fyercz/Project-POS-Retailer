export interface ManualSection {
  id: string;
  title: string;
  iconName: string;
  badge?: string;
  description: string;
  roles: ('Kasir' | 'Supervisor' | 'Manager' | 'Owner')[];
  topics: {
    id: string;
    title: string;
    summary: string;
    steps: string[];
    tips?: string[];
    shortcuts?: string[];
  }[];
}

export interface AppReleaseUpdate {
  version: string;
  releaseDate: string;
  title: string;
  highlight: string;
  changes: {
    type: 'new' | 'improved' | 'security' | 'fix';
    text: string;
  }[];
}

export interface UserFAQ {
  question: string;
  answer: string;
  category: string;
}

export const APP_VERSION = 'v2.5.0';
export const APP_LAST_UPDATED = 'September 2026';

export const USER_MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'kasir-penjualan',
    title: '1. Kasir & Transaksi Penjualan',
    iconName: 'ShoppingCart',
    badge: 'Fitur Utama',
    description: 'Panduan lengkap melayani transaksi belanja pelanggan, scan barcode, diskon item, dan metode pembayaran.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'transaksi-dasar',
        title: 'Melakukan Transaksi Penjualan Baru',
        summary: 'Langkah cepat memasukkan barang belanjaan pelanggan ke keranjang kasir.',
        steps: [
          'Tekan Ctrl+F (atau F2) atau klik bilah pencarian di bagian atas katalog produk.',
          'Ketik nama barang, kode SKU, atau scan barcode menggunakan scanner fisik / kamera HP (F3).',
          'Barang akan otomatis masuk ke keranjang kasir di sebelah kanan layar.',
          'Klik tombol [+] atau [-] pada keranjang untuk menambah atau mengurangi kuantitas belanja.',
          'Jika produk memiliki varian ukuran, topping, atau diskon khusus, klik produk di keranjang untuk membuka menu kustomisasi.',
        ],
        tips: [
          'Gunakan scanner barcode USB/Bluetooth untuk kecepatan input kasir maksimal.',
          'Tekan tombol Esc untuk menutup jendela modal yang sedang aktif atau membersihkan pencarian.',
        ],
        shortcuts: ['Ctrl+F / F2: Cari Nama/SKU', 'F3: Scanner Kamera'],
      },
      {
        id: 'parkir-pesanan',
        title: 'Memarkir Pesanan Sementara (Hold Order)',
        summary: 'Menyimpan keranjang belanja sementara saat pelanggan ingin mengambil barang tambahan, sehingga kasir dapat melayani pelanggan berikutnya.',
        steps: [
          'Saat keranjang berisi barang, tekan tombol F4 atau klik tombol "Parkir Order" di bawah keranjang.',
          'Masukkan nama catatan pesanan (misal: "Bapak Budi - Ambil Minuman Tambahan").',
          'Keranjang akan dikosongkan dan siap melayani pembeli berikutnya.',
          'Untuk membuka kembali pesanan yang diparkir, klik tombol "Pesanan Diparkir" di bagian atas kasir dan pilih "Pulihkan Pesanan".',
        ],
        tips: [
          'Pesanan yang diparkir tetap tersimpan aman dan tidak akan hilang meskipun browser dimuat ulang.',
        ],
        shortcuts: ['F4: Parkir Order'],
      },
      {
        id: 'pembayaran-nota',
        title: 'Proses Pembayaran & Cetak Struk Belanja',
        summary: 'Menyelesaikan pembayaran pelanggan dan mencetak nota struk thermal.',
        steps: [
          'Tekan tombol F9 atau klik tombol "Bayar Sekarang" di bawah keranjang.',
          'Pilih metode pembayaran: Tunai (Cash), QRIS Statis/Dinamis, Kartu Debit/Kredit, Transfer Bank, atau Saldo Member.',
          'Jika Tunai: Masukkan nominal uang yang diterima. Sistem otomatis menghitung jumlah kembalian secara presisi.',
          'Klik "Selesaikan Pembayaran". Dialog struk thermal akan terbuka.',
          'Klik "Cetak Struk" untuk mencetak ke printer thermal 58mm atau 80mm.',
        ],
        tips: [
          'Jika menggunakan mode Kiosk, gunakan flag --kiosk-printing agar struk otomatis tercetak tanpa memunculkan jendela dialog.',
          'Laci uang (Cash Drawer) otomatis terbuka setelah pembayaran tunai diselesaikan.',
        ],
        shortcuts: ['F9: Bayar / Checkout'],
      },
      {
        id: 'retur-penjualan',
        title: 'Retur Penjualan & Pengembalian Barang',
        summary: 'Prosedur membatalkan atau mengembalikan barang dari transaksi yang sudah selesai.',
        steps: [
          'Masuk ke menu "Riwayat Transaksi".',
          'Cari nomor nota transaksi yang ingin diretur.',
          'Klik tombol "Ajukan Retur" pada baris transaksi.',
          'Pilih item dan jumlah barang yang dikembalikan serta alasan retur (rusak / salah beli).',
          'Konfirmasi dengan PIN Supervisor/Manager jika fitur proteksi otorisasi aktif.',
          'Stok barang otomatis dikembalikan ke inventaris toko dan kasir mengeluarkan dana pengembalian.',
        ],
      },
    ],
  },
  {
    id: 'katalog-stok',
    title: '2. Manajemen Produk & Stok Toko',
    iconName: 'Package',
    badge: 'Inventaris',
    description: 'Mengelola katalog produk, penyesuaian stok, cetak label harga rak, dan stock opname fisik.',
    roles: ['Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'tambah-produk',
        title: 'Menambah & Mengubah Data Produk',
        summary: 'Menambahkan produk baru ke katalog lengkap dengan barcode, harga modal, harga jual, dan kategori.',
        steps: [
          'Buka menu "Katalog Produk" lalu klik tombol "+ Tambah Produk Baru".',
          'Isi Nama Produk, Kode Barcode / SKU, Kategori, Harga Beli (Modal), dan Harga Jual.',
          'Tentukan Stok Saat Ini serta Batas Stok Minimum (peringatan stok tipis).',
          'Unggah foto produk jika diperlukan.',
          'Klik "Simpan Produk". Produk langsung aktif dan siap dijual di kasir.',
        ],
      },
      {
        id: 'stock-opname-ai',
        title: 'Visual Stock Opname Berbasis AI Gemini',
        summary: 'Menghitung stok fisik di rak toko secara otomatis menggunakan foto kamera ponsel atau laptop.',
        steps: [
          'Buka menu "Stok Opname" lalu pilih "Visual AI Opname".',
          'Arahkan kamera ke rak display barang toko dan ambil foto.',
          'AI Gemini akan mendeteksi objek barang dan menghitung jumlah item yang tampak.',
          'Periksa hasil kalkulasi AI, sesuaikan jika ada perbedaan, lalu klik "Terapkan Penyesuaian Stok".',
        ],
        tips: [
          'Pastikan pencahayaan rak toko cukup terang dan produk menghadap ke arah kamera.',
        ],
      },
      {
        id: 'cetak-label-rak',
        title: 'Cetak Label Harga & Barcode Rak (Price Tag)',
        summary: 'Mencetak barcode dan label harga rak untuk ditempelkan pada etalase toko.',
        steps: [
          'Masuk ke menu "Katalog Produk".',
          'Pilih produk yang ingin dicetak labelnya (bisa pilih banyak sekaligus).',
          'Klik tombol "Cetak Label Rak / Price Tag".',
          'Pilih ukuran kertas (Label Thermal 58mm / Kertas Stiker A4).',
          'Tekan "Cetak" untuk mencetak label langsung ke printer.',
        ],
      },
    ],
  },
  {
    id: 'pengadaan-supplier',
    title: '3. Pemasok & Faktur Masuk (Supplier)',
    iconName: 'Truck',
    description: 'Mencatat pembelian barang dari distributor dan scan otomatis faktur kertas menggunakan AI.',
    roles: ['Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'ai-invoice-scanner',
        title: 'Scan Faktur Kertas Supplier dengan AI (OCR)',
        summary: 'Memasukkan barang masuk dari nota faktur distributor tanpa perlu mengetik satu per satu.',
        steps: [
          'Buka menu "Supplier & Pengadaan" lalu pilih "Scan Faktur AI".',
          'Foto faktur/surat jalan kertas dari supplier atau unggah file foto dari HP/komputer.',
          'AI Gemini akan membaca nama barang, jumlah beli, harga modal, dan total faktur secara otomatis.',
          'Periksa tabel hasil ekstraksi AI.',
          'Klik "Konfirmasi & Tambah ke Stok Toko". Stok seluruh barang yang tertera di faktur langsung bertambah.',
        ],
      },
    ],
  },
  {
    id: 'shift-kas',
    title: '4. Shift Kasir & Pengelolaan Uang Laci',
    iconName: 'Coins',
    badge: 'Keuangan',
    description: 'Membuka shift kasir, mencatat uang masuk/keluar, dan mencetak laporan serah terima shift.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'buka-tutup-shift',
        title: 'Prosedur Buka & Tutup Shift Kasir',
        summary: 'Memastikan uang fisik di laci kasir cocok dengan catatan transaksi penjualan komputer.',
        steps: [
          'Saat kasir mulai bekerja, buka menu "Shift Kasir" dan klik "Buka Shift Baru".',
          'Masukkan modal uang pecahan awal (Starting Cash) yang ada di laci.',
          'Selama bertransaksi, catat setiap uang keluar operasional (misal: beli plastik/es batu) melalui tombol "Kas Keluar".',
          'Di akhir jam kerja, klik "Tutup Shift" dan hitung uang fisik yang ada di laci kasir.',
          'Sistem akan membandingkan Uang Diharapkan vs Uang Fisik Aktual dan mencatat selisih jika ada.',
          'Cetak Laporan Penutupan Shift (Z-Report) untuk diserahkan ke Supervisor/Owner.',
        ],
        shortcuts: ['Alt + L: Kunci Layar Kasir'],
      },
    ],
  },
  {
    id: 'backup-restore',
    title: '5. Pusat Cadangan & Pemulihan (Backup & Restore)',
    iconName: 'Database',
    badge: 'Keamanan Data',
    description: 'Melindungi data toko dari kerusakan komputer atau kehilangan data dengan ekspor cadangan dan titik pemulihan.',
    roles: ['Manager', 'Owner'],
    topics: [
      {
        id: 'buat-backup',
        title: 'Membuat Berkas Cadangan (Backup JSON)',
        summary: 'Menyimpan seluruh katalog produk, stok, transaksi, pelanggan, dan pengaturan ke berkas aman.',
        steps: [
          'Tekan tombol F9 atau klik tombol "Backup & Restore" di header kasir.',
          'Pada tab "Buat Cadangan", periksa ringkasan data yang akan dicadangkan.',
          'Klik tombol "Unduh Berkas Cadangan (.json)".',
          'Simpan berkas tersebut ke Flashdisk, Google Drive, atau harddisk eksternal.',
        ],
        tips: [
          'Sangat disarankan membuat cadangan data minimal satu kali seminggu atau setiap tutup toko.',
        ],
      },
      {
        id: 'restore-point',
        title: 'Titik Pemulihan Darurat (Restore Points)',
        summary: 'Mengembalikan kondisi toko ke waktu sebelumnya dengan 1 klik tanpa memerlukan file eksternal.',
        steps: [
          'Buka menu "Backup & Restore" lalu pilih tab "Titik Pemulihan".',
          'Klik "Buat Snapshot Baru" sebelum Anda melakukan perubahan besar (misal: edit harga massal).',
          'Jika terjadi kesalahan operasional, cukup klik tombol "Pulihkan" pada snapshot yang diinginkan.',
        ],
      },
      {
        id: 'restore-berkas',
        title: 'Memulihkan Data dari Berkas Cadangan',
        summary: 'Mengembalikan data dari file JSON cadangan dengan sistem konfirmasi keamanan anti-salah.',
        steps: [
          'Buka menu "Backup & Restore" lalu pilih tab "Pulihkan dari Berkas".',
          'Unggah berkas JSON cadangan yang valid.',
          'Sistem akan memeriksa integritas data dan menampilkan perbandingan data saat ini vs data pengganti.',
          'Muncul dialog peringatan "Are You Sure? / Data Saat Ini Akan Ditimpa".',
          'Centang kotak persetujuan: "[✓] Saya yakin dan memahami bahwa data yang ada saat ini akan ditimpa."',
          'Klik tombol merah "Ya, Saya Yakin — Timpa & Pulihkan Data".',
        ],
      },
    ],
  },
  {
    id: 'desktop-mobile',
    title: '6. Mode Desktop & Multi-Device (HP/LAN)',
    iconName: 'Laptop',
    badge: 'Hardware',
    description: 'Menjalankan POS sebagai program desktop Windows/Mac/Linux dan menghubungkan handphone kasir via Wi-Fi toko.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'desktop-runner',
        title: 'Menjalankan sebagai Aplikasi Desktop Mandiri',
        summary: 'Membuka POS tanpa bilah browser, tanpa tab, dan langsung terintegrasi dengan hardware toko.',
        steps: [
          'Di komputer Windows, cukup klik ganda file "desktop.bat" di folder aplikasi.',
          'Aplikasi akan membuka jendela desktop tersendiri menggunakan Edge/Chrome App Mode.',
          'Tekan F11 untuk masuk ke Mode Kiosk Layar Penuh.',
          'Untuk keluar, tekan tombol F11 kembali.',
        ],
        shortcuts: ['Alt + D: Buka Menu Desktop', 'F11: Layar Penuh Kiosk'],
      },
      {
        id: 'connect-hp',
        title: 'Menghubungkan Handphone (Android & iPhone)',
        summary: 'Menggunakan smartphone sebagai scanner barcode keliling atau kasir portabel di toko.',
        steps: [
          'Pastikan HP dan komputer kasir terhubung ke Wi-Fi toko yang sama.',
          'Cek IP komputer kasir (contoh: 192.168.1.15).',
          'Buka browser di HP dan ketik alamat: http://192.168.1.15:3000.',
          'Pilih opsi "Tambahkan ke Layar Utama" (Add to Home Screen) agar berubah menjadi icon aplikasi mandiri di HP.',
        ],
      },
    ],
  },
  {
    id: 'lan-multi-client',
    title: '8. Server Database Multi-Client LAN (Multi-Kasir Toko)',
    iconName: 'Network',
    badge: 'Fitur Baru v2.5.0',
    description: 'Panduan menghubungkan banyak kasir (PC Kasir 1, Laptop Kasir 2, Tablet Kasir 3, HP Owner) dalam satu jaringan toko tanpa internet.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'konsep-lan-server',
        title: 'Konsep Server Master & Terminal Klien',
        summary: 'Memahami bagaimana data produk, stok, dan transaksi dibagikan antar-perangkat kasir secara real-time.',
        steps: [
          'Tentukan 1 komputer utama toko (biasanya PC Kasir 1) untuk bertindak sebagai Server Master (Host).',
          'Komputer lain (Laptop Kasir 2, Kasir 3, Tablet Pramuniaga) bertindak sebagai Terminal Klien.',
          'Semua perangkat harus terhubung ke router WiFi atau kabel LAN toko yang sama (tidak butuh kuota internet).',
          'Setiap penjualan di kasir manapun akan otomatis mengurangi stok di Server Master dan seluruh kasir lain.',
        ],
        tips: [
          'Gunakan router WiFi toko khusus untuk stabilitas maksimal.',
          'Jika IP komputer Server Master berubah, klien cukup memperbarui kolom URL Server di pengaturan LAN.',
        ],
        shortcuts: ['Alt + N'],
      },
      {
        id: 'cara-koneksi-klien',
        title: 'Langkah Menghubungkan Terminal Kasir Tambahan',
        summary: 'Cara cepat memasang kasir kedua dan smartphone ke server utama toko.',
        steps: [
          'Pada PC Kasir 1 (Master), klik tombol "Server LAN" di bilah atas atau tekan Alt + N.',
          'Salin alamat URL LAN yang tertera (contoh: http://192.168.1.105:3000) atau siapkan QR Code.',
          'Di Laptop Kasir 2 atau HP, buka browser Chrome dan ketikkan alamat tersebut atau scan QR Code dengan kamera HP.',
          'Di Kasir 2, buka menu Server LAN (Alt + N), pilih peran "Terminal Klien", lalu klik "Ping" untuk menguji koneksi.',
          'Klik tombol "Tarik Seluruh Katalog dari Server Master" untuk menyinkronkan data barang toko.',
        ],
        tips: [
          'Aktifkan opsi "Auto-Sync Real-Time" di Kasir Klien agar pembaruan stok terjadi otomatis setiap beberapa detik.',
          'Periksa apakah Windows Firewall di PC Master mengizinkan koneksi port 3000.',
        ],
        shortcuts: ['Alt + N'],
      },
      {
        id: 'parkir-pesanan-bersama',
        title: 'Parkir Pesanan Bersama (Shared Order Parking)',
        summary: 'Cara memindahkan transaksi yang belum selesai dari Kasir 1 ke Kasir 2.',
        steps: [
          'Jika pelanggan di Kasir 1 ingin mengambil barang tambahan, kasir cukup menekan tombol F4 (Hold Order).',
          'Pesanan otomatis terkirim ke Server LAN dan tersimpan dalam daftar "Parkir Antar-Kasir".',
          'Kasir 2 di meja sebelah dapat membuka menu Server LAN -> Tab "Parkir Antar-Kasir", lalu klik "Buka di Kasir Ini".',
          'Kasir 2 langsung dapat melanjutkan kasir dan menerima pembayaran tanpa harus input ulang daftar belanjaan!',
        ],
        tips: [
          'Sangat berguna saat antrean kasir sedang padat untuk mempercepat alur kasir toko.',
        ],
        shortcuts: ['F4', 'Alt + N'],
      },
    ],
  },
];

export const APP_CHANGELOG: AppReleaseUpdate[] = [
  {
    version: 'v2.5.0',
    releaseDate: '14 September 2026',
    title: 'Server Database Multi-Client LAN & Jaringan Kasir Terpadu',
    highlight: 'Dukungan operasional kasir simultan antar-PC, laptop, tablet, dan smartphone dalam 1 jaringan WiFi/LAN toko.',
    changes: [
      {
        type: 'new',
        text: 'Pusat Server Database Multi-Client LAN (Alt+N) dengan pemilihan peran Server Master (Host) vs Terminal Klien.',
      },
      {
        type: 'new',
        text: 'Shared Order Parking: Fitur parkir pesanan bersama antar-kasir, kasir lain dapat memanggil belanjaan untuk checkout.',
      },
      {
        type: 'new',
        text: 'Sinkronisasi Stok Otomatis: Penjualan di terminal manapun secara instan mendepresiasi stok di server master dan perangkat lain.',
      },
      {
        type: 'new',
        text: 'QR Code Sambungan Instan: Memudahkan smartphone atau tablet terhubung ke kasir toko via kamera tanpa mengetik IP.',
      },
      {
        type: 'improved',
        text: 'Log aktivitas server real-time dan monitoring terminal terhubung langsung dari antarmuka kasir.',
      },
    ],
  },
  {
    version: 'v2.4.0',
    releaseDate: '14 September 2026',
    title: 'Pembaruan Keamanan Pemulihan, Pusat Desktop & Dokumentasi Lengkap',
    highlight: 'Dialog konfirmasi "Are you sure?" pada restore data, launcher desktop mandiri, dan buku panduan interaktif.',
    changes: [
      {
        type: 'new',
        text: 'Buku Panduan & Dokumentasi Pengguna Terintegrasi (User Manual Modal) dengan pencarian topik dan panduan langkah demi langkah.',
      },
      {
        type: 'new',
        text: 'Peluncur Desktop Windows & Linux (desktop.bat & desktop.sh) untuk menjalankan kasir dalam jendela aplikasi tanpa browser.',
      },
      {
        type: 'security',
        text: 'Dialog konfirmasi kritis "Are you sure?" dengan visual warning penimpaan data & checkbox konfirmasi wajib saat restore backup.',
      },
      {
        type: 'improved',
        text: 'Pusat Aplikasi Kasir Desktop (Desktop Hub Modal) dengan tombol tes laci uang (Cash Drawer Kick) dan tes cetak struk thermal.',
      },
      {
        type: 'improved',
        text: 'Konfigurasi native Electron (electron/main.cjs & preload.cjs) siap kemas installer .exe.',
      },
    ],
  },
  {
    version: 'v2.3.0',
    releaseDate: 'September 2026',
    title: 'Titik Pemulihan Otomatis & Validasi Cadangan Data Toko',
    highlight: 'Pencadangan database toko instan, snapshot darurat otomatis, dan validasi file cadangan JSON.',
    changes: [
      {
        type: 'new',
        text: 'Pusat Backup & Restore Point (F9) dengan sistem snapshot lokal instan tanpa perlu unggah berkas.',
      },
      {
        type: 'improved',
        text: 'Validasi integritas schema JSON sebelum proses pemulihan untuk mencegah korupsi data kasir.',
      },
      {
        type: 'improved',
        text: 'Pembuatan restore point darurat otomatis sesaat sebelum eksekusi restore berkas dijalankan.',
      },
    ],
  },
  {
    version: 'v2.2.0',
    releaseDate: 'September 2026',
    title: 'Kecerdasan Buatan (AI) Retail Copilot & Visual Stock Opname',
    highlight: 'Integrasi Google Gemini AI untuk asisten toko, OCR faktur distributor, dan hitung stok rak otomatis.',
    changes: [
      {
        type: 'new',
        text: 'Gemini Retail Copilot (Alt+G) untuk analisis tren penjualan dan rekomendasi pengadaan stok barang.',
      },
      {
        type: 'new',
        text: 'AI Invoice Scanner: Ekstraksi otomatis barang masuk dari foto faktur kertas supplier.',
      },
      {
        type: 'new',
        text: 'Visual Stock Opname AI: Menghitung jumlah produk di rak toko secara otomatis via kamera.',
      },
    ],
  },
  {
    version: 'v2.1.0',
    releaseDate: 'September 2026',
    title: 'Arsitektur Offline-First & Keamanan Shift Kasir',
    highlight: 'Dukungan penuh transaksi offline tanpa koneksi internet dan proteksi PIN pergantian kasir.',
    changes: [
      {
        type: 'new',
        text: 'Penyimpanan lokal IndexedDB (Local-First) untuk operasional kasir 100% tanpa internet.',
      },
      {
        type: 'new',
        text: 'Sistem Shift Kasir: Pencatatan modal awal, kas masuk/keluar, dan laporan penutupan shift (Z-Report).',
      },
      {
        type: 'improved',
        text: 'Kunci Layar Kasir (Alt+L) dengan PIN otorisasi karyawan untuk keamanan kasir saat ditinggal.',
      },
    ],
  },
];

export const USER_FAQS: UserFAQ[] = [
  {
    category: 'Transaksi & Kasir',
    question: 'Bagaimana jika scanner barcode tidak terbaca?',
    answer: 'Pastikan kursor kasir aktif pada kolom pencarian (tekan tombol F2). Jika menggunakan scanner kamera (F3), pastikan izin akses kamera pada browser telah disetujui (Allow) dan ruangan cukup terang.',
  },
  {
    category: 'Transaksi & Kasir',
    question: 'Apakah transaksi bisa dilanjutkan jika listrik atau internet mati mendadak?',
    answer: 'Ya! Sistem ini beroperasi secara Offline-First. Seluruh transaksi kasir, katalog produk, dan keranjang belanja tersimpan aman di memori lokal komputer kasir dan tidak akan hilang.',
  },
  {
    category: 'Hardware & Printer',
    question: 'Printer thermal apa saja yang didukung oleh sistem ini?',
    answer: 'Aplikasi mendukung seluruh printer kasir thermal ukuran 58mm dan 80mm yang terhubung melalui kabel USB, Bluetooth, ataupun jaringan LAN/Ethernet.',
  },
  {
    category: 'Keamanan Data',
    question: 'Apakah data kasir aman jika komputer rusak?',
    answer: 'Data aman asalkan Anda rutin mengunduh berkas cadangan (Backup JSON) ke Flashdisk atau Google Drive melalui menu Backup & Restore (F9). Jika ganti komputer, cukup pasang aplikasi dan pulihkan file cadangan tersebut.',
  },
  {
    category: 'Multi-Device',
    question: 'Bisakah kasir menggunakan HP dan komputer secara bersamaan?',
    answer: 'Bisa. Cukup hubungkan HP ke Wi-Fi toko yang sama dengan komputer utama, lalu buka alamat IP komputer kasir (contoh: http://192.168.1.15:3000) di browser HP.',
  },
];
