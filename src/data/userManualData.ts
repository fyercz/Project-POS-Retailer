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

export const APP_VERSION = 'v2.6.5';
export const APP_LAST_UPDATED = '23 September 2026';

export const USER_MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'kasir-penjualan',
    title: '1. Kasir & Transaksi Penjualan (POS)',
    iconName: 'ShoppingCart',
    badge: 'Fitur Utama',
    description: 'Panduan lengkap melayani transaksi belanja pelanggan, scan barcode fisik & kamera, diskon item, kustomisasi varian, dan cetak struk belanja thermal.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'transaksi-dasar',
        title: 'Melakukan Transaksi Penjualan Baru',
        summary: 'Langkah cepat memasukkan barang belanjaan pelanggan ke keranjang kasir.',
        steps: [
          'Tekan Ctrl+F (atau F2) atau klik kolom pencarian di bagian atas katalog produk.',
          'Ketik nama barang, kode SKU, atau scan barcode menggunakan scanner fisik USB/Bluetooth / kamera HP (F3).',
          'Barang akan otomatis masuk ke keranjang kasir di sebelah kanan layar.',
          'Klik tombol [+] atau [-] pada keranjang untuk menambah atau mengurangi kuantitas belanja.',
          'Jika produk memiliki varian ukuran, tingkat kemanisan, atau diskon khusus, klik tombol pensil/kustomisasi pada produk di keranjang.',
        ],
        tips: [
          'Gunakan scanner barcode USB/Bluetooth untuk kecepatan input kasir maksimal tanpa sentuh mouse.',
          'Tekan tombol Esc untuk menutup dialog pop-up yang sedang aktif atau membersihkan pencarian.',
        ],
        shortcuts: ['Ctrl+F / F2: Cari Nama/SKU/Barcode', 'F3: Barcode Scanner Kamera'],
      },
      {
        id: 'barcode-belum-terdaftar',
        title: 'Scan Barcode Barang Belum Terdaftar (Otoritas Supervisor / Owner)',
        summary: 'Penanganan saat kasir memindai barcode barang yang belum ada di database master toko.',
        steps: [
          'Saat kasir memindai barcode barang fisik di kasir atau kamera scanner (F3) dan kode barcode belum ada di database, sistem seketika memunculkan dialog "Barcode Belum Terdaftar".',
          'Sesuai SOP keamanan toko, kasir frontliner tidak dapat mendaftarkan produk baru secara mandiri demi mencegah manipulasi harga/stok.',
          'Pilih Supervisor atau Owner yang sedang bertugas di toko, lalu minta beliau memasukkan 4-digit PIN otorisasi (atau gunakan keypad pada layar).',
          'Jika akun yang sedang login sudah memiliki wewenang di atas kasir (Supervisor / Owner / Inventory), tombol "Tambah Produk Sekarang" dapat langsung diklik tanpa perlu memasukkan PIN ulang.',
          'Formulir pendaftaran produk baru akan terbuka dengan kode barcode yang telah terisi otomatis (pre-filled).',
          'Isi nama produk (atau klik "Cari di Database Online" untuk otomatis melengkapi nama, merek, dan kategori), tentukan harga jual, harga modal, dan stok awal.',
          'Klik "Simpan Produk". Sistem secara otomatis menyimpan produk baru ke master inventaris dan langsung memasukkan barang tersebut ke keranjang aktif kasir.',
        ],
        tips: [
          'Transaksi pelanggan tidak terputus: Kasir tidak perlu mengulang scan karena produk baru otomatis masuk ke nota belanja yang sedang berjalan.',
          'PIN default otorisasi master: Supervisor (7890) atau Hendro Wijaya Owner (9999). Dapat diubah kapan saja di menu Kelola Master Karyawan.',
        ],
        shortcuts: ['F3: Scanner Barcode', 'Enter: Cari / Validasi Barcode'],
      },
      {
        id: 'parkir-pesanan',
        title: 'Memarkir Pesanan Sementara (Hold Order)',
        summary: 'Menyimpan keranjang belanja sementara saat pelanggan ingin mengambil barang tambahan, sehingga kasir dapat langsung melayani antrean berikutnya.',
        steps: [
          'Saat keranjang berisi barang belanjaan, tekan tombol F4 atau klik tombol "Parkir Order" di bawah keranjang.',
          'Masukkan nama catatan pesanan (misal: "Bapak Budi - Ambil Minuman Tambahan").',
          'Keranjang akan dikosongkan seketika dan kasir siap melayani pembeli berikutnya.',
          'Untuk membuka kembali pesanan yang diparkir, klik tombol "Pesanan Diparkir" di header keranjang dan pilih "Pulihkan Pesanan".',
        ],
        tips: [
          'Pesanan yang diparkir tetap tersimpan aman di memori lokal dan tidak akan hilang meskipun halaman dimuat ulang.',
          'Jika fitur Server LAN aktif, pesanan yang diparkir dapat dibuka dan dibayar di terminal kasir lain (Shared Parking)!',
        ],
        shortcuts: ['F4: Parkir Order'],
      },
      {
        id: 'diskon-kupon-member',
        title: 'Memberi Diskon Nota, Promo & Poin Member',
        summary: 'Menerapkan diskon manual persen/nominal, kupon potongan, dan penukaran poin loyalti member toko.',
        steps: [
          'Pilih member pelanggan dari dropdown pelanggan atau tekan tombol "+ Pelanggan" untuk daftarkan nomor HP pelanggan.',
          'Jika pelanggan memiliki poin yang cukup, centang opsi "Tukarkan Poin Belanja" untuk memotong total tagihan otomatis.',
          'Klik tombol "Diskon Nota" untuk memasukkan potongan harga khusus (persen atau nominal rupiah).',
          'Total akhir tagihan akan terkalkulasi otomatis dengan rincian subtotal, diskon, dan pajak (jika aktif).',
        ],
        tips: [
          'Tingkat Tier Member (Bronze, Silver, Gold, Platinum) memberikan persentase cashback poin belanja yang berbeda-beda.',
        ],
      },
      {
        id: 'pembayaran-nota',
        title: 'Proses Pembayaran & Cetak Struk Belanja Thermal',
        summary: 'Menyelesaikan pembayaran pelanggan dengan berbagai metode bayar dan mencetak nota struk thermal kasir.',
        steps: [
          'Tekan tombol F9 atau klik tombol hijau "Bayar Sekarang" di bawah keranjang belanja.',
          'Pilih metode pembayaran yang digunakan pembeli: Tunai (Cash), QRIS EDC BRI (diproses via mesin EDC BRI), atau Kartu EDC BRI (Debit/Kredit).',
          'Jika Tunai: Masukkan nominal uang yang diterima (atau pilih pecahan cepat Rp 50.000, Rp 100.000). Sistem otomatis menghitung jumlah kembalian secara presisi.',
          'Jika QRIS / EDC: Input nominal pada mesin EDC BRI toko, setelah struk EDC approved, masukkan No. Ref / RRN EDC untuk mempermudah audit rekonsiliasi.',
          'Klik "Selesaikan Pembayaran". Dialog struk kasir akan terbuka dan transaksi otomatis masuk ke Laporan Pembayaran & Settlement EDC BRI.',
          'Klik "Cetak Struk" untuk mencetak nota ke printer thermal 58mm atau 80mm.',
        ],
        tips: [
          'Di mode Desktop/Kiosk, Anda dapat mengaktifkan opsi Cetak Senyap (Silent Print) agar struk langsung keluar tanpa dialog browser.',
          'Laci uang kasir (Cash Drawer) otomatis terbuka setelah pembayaran tunai dinyatakan lunas.',
        ],
        shortcuts: ['F9: Bayar / Selesaikan Pesanan'],
      },
      {
        id: 'retur-penjualan',
        title: 'Retur Penjualan & Pengembalian Barang Pelanggan',
        summary: 'Prosedur membatalkan atau mengembalikan barang dari transaksi yang sudah selesai secara akuntabel.',
        steps: [
          'Masuk ke menu navigasi "Riwayat Transaksi".',
          'Cari nomor nota atau nama pelanggan yang ingin melakukan retur barang.',
          'Klik tombol "Ajukan Retur" pada baris transaksi terkait.',
          'Pilih item dan kuantitas barang yang dikembalikan serta catat alasan retur (misal: barang cacat/salah ukuran).',
          'Konfirmasi dengan PIN Supervisor/Manager jika proteksi otorisasi toko aktif.',
          'Stok barang toko otomatis dikembalikan ke gudang inventaris dan kasir mengeluarkan dana pengembalian.',
        ],
      },
    ],
  },
  {
    id: 'pusat-alat-sistem',
    title: '2. Pusat Alat & Sistem Terpadu (Header Tools)',
    iconName: 'Settings',
    badge: 'Navigasi Baru',
    description: 'Panduan mengakses seluruh utilitas toko, server LAN, backup restore, mode desktop, pengaturan nota & printer, dan pintasan keyboard.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'akses-pusat-alat',
        title: 'Mengakses Menu Pusat Alat di Header',
        summary: 'Satu pintu terintegrasi di pojok kanan atas layar untuk mengakses konfigurasi jaringan dan pemeliharaan data toko.',
        steps: [
          'Klik tombol menu "Pusat Alat" di bilah header atas (ikon roda gigi).',
          'Menu dropdown akan menampilkan opsi: Server LAN Multi-Kasir, Backup & Restore Data, Mode Desktop & Kiosk, Pengaturan Toko & Struk, Pintasan Keyboard, dan Pengubah Tema.',
          'Klik tombol "Panduan" (F1 / Alt+H) di sebelah kiri tombol Pusat Alat untuk membuka buku dokumentasi ini kapan saja.',
        ],
        shortcuts: ['F1 / Alt+H: Buku Panduan', 'Alt+T: Tema Terang / Gelap'],
      },
      {
        id: 'pengaturan-toko-printer',
        title: 'Konfigurasi Profil Toko, Struk & Pajak',
        summary: 'Mengatur nama toko, alamat, nomor telepon, logo struk, tarif PPN, dan pesan terima kasih di footer struk.',
        steps: [
          'Buka menu "Pusat Alat" -> klik "Pengaturan Toko & Struk".',
          'Isi Nama Toko, Alamat Ritel, Nomor Telepon / WhatsApp, dan Instagram Toko.',
          'Atur lebar kertas printer default (58mm untuk printer mini atau 80mm untuk printer standar).',
          'Aktifkan atau nonaktifkan perhitungan PPN (11% atau persentase custom).',
          'Tuliskan catatan ucapan pada kaki struk (contoh: "Barang yang sudah dibeli tidak dapat ditukar").',
          'Klik "Simpan Pengaturan". Seluruh struk baru akan otomatis menggunakan format terkini.',
        ],
        tips: [
          'Hanya pengguna dengan peran Owner yang memiliki wewenang mengubah data identitas toko dan persentase pajak.',
        ],
      },
    ],
  },
  {
    id: 'katalog-stok',
    title: '3. Manajemen Produk, Stok & Opname Fisik',
    iconName: 'Package',
    badge: 'Inventaris Lengkap',
    description: 'Mengelola katalog produk, penyesuaian stok massal, visual stock opname AI kamera, import file CSV, dan cetak barcode label rak.',
    roles: ['Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'tambah-edit-produk',
        title: 'Menambah & Mengubah Data Produk',
        summary: 'Mendaftarkan produk baru ke etalase toko lengkap dengan barcode SKU, modal, harga jual, dan batas stok tipis.',
        steps: [
          'Buka menu "Inventaris & Stok".',
          'Klik tombol hijau "+ Tambah Produk" di bilah atas.',
          'Isi Nama Produk, Kode Barcode / SKU (atau klik generate barcode otomatis), Kategori, Satuan (Pcs, Box, Kg), dan Supplier.',
          'Tentukan Harga Modal (Beli) dan Harga Jual Retail Toko. Sistem akan menghitung margin keuntungan kotor seketika.',
          'Tentukan Stok Saat Ini serta Batas Minimum Stok (peringatan stok hampir habis).',
          'Klik "Simpan Produk". Produk langsung muncul di katalog dan siap dijual oleh kasir.',
        ],
        tips: [
          'Gunakan scanner barcode fisik untuk menembak barcode kemasan produk langsung ke kolom input Barcode agar tidak ada salah ketik.',
        ],
      },
      {
        id: 'menu-opname-audit',
        title: 'Menu Dropdown "Opname & Audit Stok"',
        summary: 'Menghitung dan mencocokkan stok fisik di toko dengan cepat melalui berbagai metode audit.',
        steps: [
          'Di tab Inventaris, klik tombol dropdown "Opname & Audit".',
          'Tersedia 4 pilihan audit:',
          '1. Cek Stok AI (Kamera): Deteksi dan hitung jumlah produk di rak toko otomatis menggunakan kecerdasan buatan Gemini.',
          '2. Stock Opname CSV / Excel: Input tabel stok fisik massal atau copy-paste dari lembar kerja spreadsheet Excel.',
          '3. Penyesuaian Stok Massal: Koreksi jumlah stok dan tanggal expired banyak barang sekaligus dalam satu layar.',
          '4. Import & Koreksi Produk: Upload file data barang massal dengan auto-koreksi gramasi dan ejaan otomatis.',
        ],
      },
      {
        id: 'cetak-label-rak',
        title: 'Cetak Label Harga & Barcode Rak (Price Tag)',
        summary: 'Mencetak barcode dan label harga rak display toko untuk ditempelkan pada etalase toko.',
        steps: [
          'Di daftar produk Inventaris, klik tombol cetak label atau centang beberapa produk sekaligus.',
          'Klik tombol "Cetak Label Rak / Price Tag".',
          'Pilih template label (Label Thermal 58mm, Label Barcode Stiker, atau Kertas Etalase A4).',
          'Periksa pratinjau tampilan barcode, nama barang, dan harga retail.',
          'Tekan "Cetak Sekarang" untuk mencetak langsung ke printer.',
        ],
      },
      {
        id: 'riwayat-harga',
        title: 'Melacak Fluktuasi Harga Modal & Harga Jual',
        summary: 'Melihat histori perubahan harga beli dari supplier dan penyesuaian harga jual konsumen dari waktu ke waktu.',
        steps: [
          'Buka dropdown "Data & Cadangan" di tab Inventaris -> pilih "Riwayat Fluktuasi Harga".',
          'Anda dapat melihat grafik tren harga per produk, tanggal perubahan, margin keuntungan, dan siapa yang mengubah harga.',
          'Fitur ini mencegah penurunan margin laba ketika supplier menaikkan harga modal barang.',
        ],
      },
    ],
  },
  {
    id: 'pengadaan-supplier',
    title: '4. Pengadaan, Logistik & Faktur Supplier',
    iconName: 'Truck',
    badge: 'Logistik',
    description: 'Mencatat pembelian barang masuk (PO), scan faktur distributor dengan AI OCR, retur barang ke supplier, dan kontak vendor.',
    roles: ['Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'menu-logistik-faktur',
        title: 'Menu Dropdown "Logistik & Faktur"',
        summary: 'Pusat operasional penerimaan barang masuk dari distributor pabrik dan retur.',
        steps: [
          'Di tab Inventaris, klik tombol dropdown "Logistik & Faktur".',
          'Pilih aksi yang diinginkan:',
          '1. + Terima Barang / PO: Input nomor faktur pengiriman distributor dan tambahkan stok baru ke toko.',
          '2. + Retur ke Supplier: Kembalikan barang rusak, cacat, atau mendekati tanggal kadaluarsa ke pihak distributor.',
          '3. + Tambah Mitra Supplier: Daftarkan kontak vendor baru, alamat, nomor telepon sales, dan jangka waktu tempo pembayaran (Hutang Dagang).',
        ],
      },
      {
        id: 'ai-invoice-scanner',
        title: 'Scan Faktur Kertas Supplier dengan AI (OCR)',
        summary: 'Memasukkan barang masuk dari lembar faktur kertas distributor tanpa perlu mengetik manual satu per satu.',
        steps: [
          'Buka menu "Terima Barang" lalu pilih tab "Scan Faktur AI".',
          'Ambil foto lembar faktur/surat jalan kertas dari distributor atau unggah file gambar dari galeri.',
          'AI Gemini akan mengekstrak nomor faktur, nama supplier, daftar produk, jumlah pcs/karton, dan harga beli secara otomatis.',
          'Periksa tabel hasil ekstraksi AI dan cocokkan dengan barang fisik yang datang.',
          'Klik "Konfirmasi & Tambah ke Stok Toko". Stok seluruh produk seketika bertambah di sistem.',
        ],
        tips: [
          'Pastikan foto faktur cukup terang, tidak terlipat, dan teks rincian barang terbaca jelas oleh kamera.',
        ],
      },
    ],
  },
  {
    id: 'ai-retail-copilot',
    title: '5. AI Restock Intelligence & Gemini Copilot',
    iconName: 'Sparkles',
    badge: 'Kecerdasan Buatan',
    description: 'Menganalisis perputaran barang (fast-moving vs slow-moving), rekomendasi jumlah pembelian kembali (PO), dan asisten retail cerdas.',
    roles: ['Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'ai-restock-plan',
        title: 'Membuat Rencana Restock Otomatis (AI Restock Plan)',
        summary: 'AI menghitung tingkat stok saat ini, kecepatan penjualan harian, dan menghasilkan rekomendasi PO belanja sebelum toko kehabisan stok.',
        steps: [
          'Di tab Inventaris, klik tombol emas "AI Restock Plan" (ikon bintang berkilau).',
          'Sistem AI Gemini akan menganalisis seluruh katalog produk yang stoknya berada di bawah batas minimum.',
          'AI menyajikan rekomendasi jumlah barang yang harus dipesan kembali lengkap dengan estimasi modal yang dibutuhkan.',
          'Klik tombol "Buat Draft PO" untuk langsung mengonversi rekomendasi AI menjadi pesanan pembelian supplier.',
        ],
      },
      {
        id: 'gemini-copilot-chat',
        title: 'Konsultasi Retail dengan Gemini Copilot (Alt+G)',
        summary: 'Asisten AI interaktif untuk menanyakan tren penjualan, saran bundling produk promo, dan analisis strategi toko.',
        steps: [
          'Tekan Alt+G atau klik widget Gemini Retail Copilot di pojok bawah layar.',
          'Ketik pertanyaan Anda, contoh: "Produk apa yang paling laris minggu ini?" atau "Bagaimana cara meningkatkan penjualan kategori Snack?".',
          'Gemini AI membaca data statistik penjualan toko Anda dan memberikan jawaban serta saran tindakan praktis.',
        ],
        shortcuts: ['Alt + G: Buka Gemini Copilot'],
      },
    ],
  },
  {
    id: 'loyalitas-pelanggan',
    title: '6. Program Loyalitas Pelanggan & Kalkulator Poin',
    iconName: 'Award',
    badge: 'Customer Loyalty',
    description: 'Kelola data pelanggan member, tier keanggotaan (Bronze, Silver, Gold, Platinum), kalkulator simulasi poin, dan buku besar riwayat poin.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'direktori-member',
        title: 'Pendaftaran & Manajemen Member Toko',
        summary: 'Mendaftarkan pelanggan tetap toko untuk mendapatkan poin reward setiap kali berbelanja.',
        steps: [
          'Buka menu navigasi "Pelanggan & Member".',
          'Pada tab "Direktori Member", klik "+ Tambah Pelanggan".',
          'Masukkan Nama Lengkap, Nomor HP/WhatsApp (sebagai ID utama), Alamat, dan Email pelanggan.',
          'Tingkat keanggotaan (Tier) akan meningkat otomatis seiring bertambahnya total akumulasi belanja pelanggan.',
        ],
      },
      {
        id: 'kalkulator-poin',
        title: 'Kalkulator Poin & Simulasi Diskon Otomatis',
        summary: 'Alat bantu kasir untuk menghitung berapa poin yang diperoleh dari nominal belanja dan berapa nilai potongan rupiahnya.',
        steps: [
          'Di menu Pelanggan, buka tab "Kalkulator Poin".',
          'Ketikkan estimasi nominal belanja pelanggan (misal: Rp 150.000).',
          'Sistem langsung mengkalkulasikan perolehan poin berdasarkan aturan toko dan nilai konversinya ke rupiah.',
          'Kasir dapat memperlihatkan simulasi ini kepada pelanggan untuk mendorong pembeli menambah nominal belanjanya.',
        ],
      },
      {
        id: 'riwayat-aturan-poin',
        title: 'Buku Besar Riwayat Poin & Aturan Loyalitas',
        summary: 'Memeriksa mutasi poin keluar/masuk serta mengatur rasio perolehan poin toko.',
        steps: [
          'Tab "Riwayat Poin": Melihat catatan audit setiap transaksi yang menghasilkan atau memotong poin member.',
          'Tab "Aturan Loyalitas": Atur kelipatan belanja untuk mendapatkan 1 poin (misal: setiap belanja Rp 10.000 = 1 Poin) dan nilai konversi 1 poin = Rp 100.',
          'Aturan ini langsung berlaku secara real-time pada seluruh transaksi kasir POS.',
        ],
      },
    ],
  },
  {
    id: 'shift-kas',
    title: '7. Shift Kasir & Pengelolaan Uang Laci',
    iconName: 'Coins',
    badge: 'Keuangan Kasir',
    description: 'Membuka shift kasir, mencatat modal awal, pengeluaran kas operasional (petty cash), dan cetak laporan Z-Report penutupan kasir.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'buka-tutup-shift',
        title: 'Prosedur Buka & Tutup Shift Kasir',
        summary: 'Memastikan uang fisik di laci kasir cocok dengan catatan transaksi penjualan komputer.',
        steps: [
          'Saat kasir mulai bertugas, klik menu "Shift Kasir" dan klik "Buka Shift Baru".',
          'Masukkan modal uang kembalian awal (Starting Cash) yang ada di laci kasir.',
          'Selama kasir beroperasi, catat setiap uang keluar operasional (misal: beli kantong kresek/es batu) melalui tombol "Kas Keluar".',
          'Di akhir jam kerja, klik "Tutup Shift" dan hitung seluruh uang fisik yang ada di laci kasir.',
          'Sistem membandingkan Uang Diharapkan Sistem vs Uang Fisik Aktual dan mencatat selisih (imbang, lebih, atau kurang).',
          'Cetak Laporan Penutupan Shift (Z-Report) untuk ditandatangani dan diserahkan ke Supervisor/Owner.',
        ],
        shortcuts: ['Alt + L: Kunci Layar Kasir'],
      },
      {
        id: 'kunci-layar-kasir',
        title: 'Kunci Layar Kasir (Lock Screen PIN)',
        summary: 'Mengamankan kasir saat ditinggal istirahat atau pergantian kasir tanpa harus mematikan komputer.',
        steps: [
          'Tekan tombol Alt+L pada keyboard atau klik tombol gembok di pojok kanan atas.',
          'Layar POS terkunci seketika. Transaksi belanja yang sedang berlangsung tetap aman di latar belakang.',
          'Untuk membuka kunci, kasir atau supervisor cukup memasukkan PIN 4-digit miliknya.',
        ],
        shortcuts: ['Alt + L: Kunci Layar'],
      },
    ],
  },
  {
    id: 'laporan-keuangan',
    title: '8. Laporan Penjualan, Laba Rugi & Analisis',
    iconName: 'BarChart3',
    badge: 'Laporan Finansial',
    description: 'Melihat omset penjualan harian/bulanan, perhitungan laba kotor, produk paling laris, serta cetak X-Report dan Z-Report thermal.',
    roles: ['Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'dashboard-laporan',
        title: 'Melihat Ringkasan Omset & Laba Kotor Toko',
        summary: 'Mengetahui performa pendapatan dan keuntungan bersih harian secara instan.',
        steps: [
          'Buka menu navigasi "Laporan Penjualan".',
          'Pilih filter periode waktu: Hari Ini, Kemarin, 7 Hari Terakhir, Bulan Ini, atau Rentang Tanggal Custom.',
          'Periksa metrik utama: Total Omset (Gross Sales), Laba Kotor (Gross Profit), Margin Rata-Rata (%), Jumlah Transaksi, dan Rata-rata Nilai Belanja per Transaksi (Basket Size).',
          'Grafik penjualan interaktif menyajikan tren jam-jam sibuk belanja pelanggan.',
        ],
      },
      {
        id: 'cetak-x-z-report',
        title: 'Cetak Laporan Thermal (X-Report & Z-Report)',
        summary: 'Mencetak ringkasan penerimaan uang kasir ke printer thermal POS.',
        steps: [
          'Klik tombol "Cetak Laporan POS" di pojok kanan atas menu Laporan.',
          'Pilih jenis laporan: X-Report (Laporan tengah hari sementara) atau Z-Report (Laporan tutup buku harian final).',
          'Laporan akan memuat rincian penjualan per metode bayar (Tunai, QRIS, Kartu, Poin), total diskon, dan kas keluar operasional.',
          'Klik tombol "Cetak ke Printer Thermal" untuk mencetak struk audit.',
        ],
      },
      {
        id: 'ekspor-excel',
        title: 'Ekspor Laporan Transaksi ke File Excel / CSV',
        summary: 'Mengunduh rekap transaksi untuk keperluan pembukuan akuntansi atau pelaporan pajak.',
        steps: [
          'Di menu Laporan atau Riwayat Transaksi, klik tombol "Ekspor CSV / Excel".',
          'File rekapitulasi data penjualan langsung terunduh ke komputer dan siap dibuka di Microsoft Excel atau Google Sheets.',
        ],
      },
    ],
  },
  {
    id: 'panduan-supervisor',
    title: '9. Panduan Khusus Supervisor: Rekap Bulanan, Audit & Kontrol Toko',
    iconName: 'ShieldCheck',
    badge: 'Khusus Supervisor',
    description: 'Pedoman Standar Operasional Prosedur (SOP) bagi Supervisor toko: penyusunan rekap laporan bulanan, rekonsiliasi kas, otorisasi transaksi void/retur, audit stok opname, dan pengawasan operasional kasir.',
    roles: ['Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'rekap-laporan-bulanan',
        title: 'Penyusunan Rekap Laporan Bulanan (Monthly Closing)',
        summary: 'Langkah resmi supervisor dalam menyusun laporan tutup buku akhir bulan, rekonsiliasi omzet, dan ekspor data ke Excel / kertas A4 untuk diserahkan kepada Pemilik Toko (Owner).',
        steps: [
          'Buka menu "Laporan Penjualan" di bilah navigasi utama.',
          'Klik filter rentang periode lalu pilih opsi "Bulan Ini" (atau "30 Hari Terakhir").',
          'Periksa 5 komponen utama performa keuangan bulanan:',
          '1. Omzet Kotor (Gross Sales): Total seluruh penjualan kotor sebelum dipotong retur dan diskon.',
          '2. Nilai Retur Penjualan: Akumulasi refund pengembalian barang dari pembeli.',
          '3. Omzet Bersih (Net Sales): Omzet riil yang didapatkan toko (Omzet Kotor dikurangi Retur).',
          '4. HPP (Harga Pokok Penjualan): Total modal dasar dari seluruh kuantitas produk yang berhasil terjual.',
          '5. Laba Kotor Toko (Gross Profit): Selisih Omzet Bersih dikurangi Total HPP beserta persentase margin laba.',
          'Rekonsiliasi Rincian Metode Bayar: Pastikan total penerimaan Tunai cocok dengan setoran brankas, total QRIS & Mesin EDC cocok dengan mutasi settlement bank, dan total Transfer cocok dengan rekening koran toko.',
          'Klik tombol "Cetak Laporan POS" -> pilih format kertas "A4" untuk mencetak berkas laporan resmi manajemen, atau klik "Ekspor CSV / Excel" untuk menyimpan file rekapitulasi data akuntansi.',
        ],
        tips: [
          'Lakukan ekspor data rekap bulanan sebelum tanggal 5 di bulan berikutnya agar dokumen akuntansi toko selalu rapi.',
          'Beri nama file cadangan Excel dengan format seragam, contoh: "Rekap_Penjualan_Toko_September_2026.xlsx".',
        ],
      },
      {
        id: 'otorisasi-void-retur-spv',
        title: 'Prosedur Otorisasi Kasir (Void Nota, Retur & Diskon Khusus)',
        summary: 'Aturan verifikasi dan penggunaan PIN Otoritas Supervisor saat staf kasir memerlukan pembatalan transaksi belanja atau retur barang konsumen.',
        steps: [
          'Saat staf kasir melakukan void nota belanja, menghapus item pesanan yang sudah terkunci, atau memproses retur barang, sistem akan menampilkan dialog "Otoritas Supervisor Diperlukan".',
          'Supervisor wajib hadir langsung di meja kasir untuk memverifikasi bukti fisik nota belanja asli dan memastikan fisik barang yang hendak diretur (keadaan kemasan utuh, tidak kedaluwarsa, atau cacat pabrik).',
          'Supervisor memasukkan 4-digit PIN miliknya pada jendela otorisasi (PIN default: "9999" atau PIN personal supervisor yang didaftarkan di data karyawan).',
          'Sistem mencatat nama Supervisor yang menyetujui transaksi ke dalam audit log internal demi mencegah kecurangan.',
        ],
        tips: [
          'JANGAN PERNAH memberikan atau membocorkan PIN Supervisor kepada staf kasir biasa. Kehadiran fisik supervisor adalah syarat mutlak persetujuan void/retur.',
          'Jika ada nota gantung mencurigakan yang dibatalkan tanpa kehadiran pembeli, lakukan kroscek rekaman CCTV di jam transaksi terkait.',
        ],
      },
      {
        id: 'audit-shift-kasir-selisih',
        title: 'Audit Shift Kasir & Pengendalian Selisih Kas (Cash Discrepancy)',
        summary: 'Memeriksa keakuratan uang fisik laci kasir saat pergantian giliran kerja (shift) dan menyelesaikan selisih uang kasir.',
        steps: [
          'Dampingi staf kasir pada saat mengakhiri tugas dan membuka formulir "Tutup Shift".',
          'Hitung uang fisik lembaran dan receh bersama kasir, lalu input nominal uang aktual ke kolom perhitungan sistem.',
          'Periksa selisih yang dikalkulasikan otomatis oleh sistem (Uang Diharapkan Komputer vs Uang Aktual Fisik di Laci):',
          '• Jika Selisih = Rp 0 (Imbang / Match): Cetak struk Z-Report penutupan shift, tanda tangani bersama kasir, dan masukkan uang hasil penjualan ke amplop setoran brankas.',
          '• Jika Selisih Kurang (Shortage): Periksa nota-nota Kas Keluar Operasional (Petty Cash) yang mungkin lupa dicatat kasir. Jika bukan karena petty cash, mintalah kasir membuat berita acara selisih dan mengganti kekurangan sesuai SOP toko.',
          '• Jika Selisih Lebih (Overage): Lakukan penelusuran apakah ada transaksi QRIS/Transfer yang keliru diinput kasir sebagai uang Tunai.',
        ],
        tips: [
          'Klip struk Z-Report thermal penutupan shift bersama seluruh nota bukti pengeluaran petty cash sebagai bukti fisik harian yang sah.',
        ],
      },
      {
        id: 'audit-stok-opname-spv',
        title: 'Audit Stock Opname Berkala & Pencegahan Susut Barang (Loss Prevention)',
        summary: 'Mengontrol kesesuaian fisik barang di etalase toko dengan database inventaris untuk menekan angka kehilangan (shrinkage) dan barang kedaluwarsa.',
        steps: [
          'Buat jadwal Stock Opname mingguan per kategori berputar (contoh: Minggu 1 kategori Sembako, Minggu 2 Minuman & Snack, Minggu 3 Rokok & Produk High-Value).',
          'Buka tab Inventaris -> klik dropdown "Opname & Audit":',
          '• Gunakan "Cek Stok AI (Kamera)" untuk memindai deretan rak panjang secara otomatis menggunakan kamera.',
          '• Gunakan "Stock Opname CSV / Excel" untuk memasukkan data hasil penghitungan manual tim toko.',
          'Jika ditemukan perbedaan antara Stok Fisik vs Stok Komputer, lakukan investigasi silang ke riwayat faktur pembelian supplier dan riwayat retur.',
          'Bila selisih diakibatkan oleh barang rusak atau kadaluarsa di rak, lakukan "Penyesuaian Stok Massal" dengan keterangan resmi agar kerugian diakui secara akurat di pembukuan.',
        ],
        tips: [
          'Produk bernilai tinggi dan barang yang mudah diselipkan wajib dihitung lebih sering (minimal 1 kali per minggu).',
        ],
      },
      {
        id: 'pengawasan-supplier-tempo',
        title: 'Pengawasan Pengadaan Barang & Tempo Pembayaran Supplier',
        summary: 'Memantau penerimaan barang masuk distributor, mengecek stabilitas harga modal, dan mencegah keterlambatan pembayaran tempo.',
        steps: [
          'Di tab Inventaris, buka dropdown "Logistik & Faktur" -> pilih riwayat penerimaan barang atau vendor supplier.',
          'Periksa daftar faktur pembelian barang yang berstatus Tempo (Hutang Dagang).',
          'Perhatikan kolom Tanggal Jatuh Tempo untuk memastikan bagian keuangan melakukan pembayaran tepat waktu sebelum jatuh tempo.',
          'Buka menu "Riwayat Fluktuasi Harga" di dropdown "Data & Cadangan" untuk memantau apakah ada lonjakan harga modal dari distributor yang perlu diimbangi dengan penyesuaian harga jual toko.',
        ],
      },
      {
        id: 'keamanan-karyawan-pin',
        title: 'Manajemen Akun Kasir, Keamanan PIN & Kunci Layar',
        summary: 'Mengelola data karyawan kasir toko, mereset PIN staf kasir yang lupa, dan memastikan keamanan terminal kasir.',
        steps: [
          'Buka menu Pengaturan Karyawan (memerlukan PIN Supervisor / Owner).',
          'Pastikan setiap kasir yang bertugas memiliki akun personal tersendiri (bukan memakai akun kasir orang lain) untuk mempermudah audit jika ada selisih kas.',
          'Jika ada staf kasir yang lupa 4-digit PIN miliknya, Supervisor dapat mengedit akun kasir tersebut dan menetapkan PIN pengganti.',
          'Lakukan rotasi PIN Supervisor setiap 1–3 bulan demi menjaga kerahasiaan hak otorisasi.',
          'Edukasi staf kasir untuk selalu mengunci layar kasir (Alt + L) setiap kali meninggalkan meja kasir walau hanya beberapa menit.',
        ],
        shortcuts: ['Alt + L: Kunci Layar Kasir'],
      },
    ],
  },
  {
    id: 'backup-restore',
    title: '10. Pusat Cadangan & Pemulihan (Backup & Restore)',
    iconName: 'Database',
    badge: 'Keamanan Data',
    description: 'Melindungi data toko dari kerusakan komputer atau kehilangan data dengan ekspor file cadangan JSON dan titik pemulihan darurat.',
    roles: ['Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'buat-backup',
        title: 'Membuat Berkas Cadangan (Backup JSON)',
        summary: 'Menyimpan seluruh katalog produk, stok, transaksi, pelanggan, dan pengaturan ke berkas aman.',
        steps: [
          'Buka menu "Pusat Alat" di header atas -> klik "Backup & Restore Data" (atau tekan tombol F9).',
          'Pada tab "Buat Cadangan", periksa ringkasan jumlah data produk, transaksi, dan member.',
          'Klik tombol hijau "Unduh Berkas Cadangan (.json)".',
          'Simpan berkas cadangan tersebut ke Flashdisk, harddisk eksternal, atau Google Drive.',
        ],
        tips: [
          'Sangat disarankan membuat cadangan data minimal satu kali setiap minggu atau sebelum melakukan perubahan harga massal.',
        ],
        shortcuts: ['F9: Backup & Restore'],
      },
      {
        id: 'restore-point',
        title: 'Titik Pemulihan Darurat (Local Restore Points)',
        summary: 'Mengembalikan kondisi database toko ke snapshot waktu sebelumnya dengan 1 klik tanpa file eksternal.',
        steps: [
          'Buka menu Backup & Restore lalu pilih tab "Titik Pemulihan".',
          'Klik "Buat Snapshot Baru" sebelum Anda melakukan audit atau import barang besar.',
          'Jika terjadi kesalahan operasional, cukup klik tombol "Pulihkan" pada snapshot yang diinginkan.',
          'Sistem secara otomatis mengembalikan database ke waktu snapshot tersebut dibuat.',
        ],
      },
      {
        id: 'restore-berkas',
        title: 'Memulihkan Data dari Berkas Cadangan Eksternal',
        summary: 'Mengembalikan data dari file JSON cadangan dengan sistem konfirmasi keamanan anti-salah.',
        steps: [
          'Buka menu Backup & Restore lalu pilih tab "Pulihkan dari Berkas".',
          'Unggah berkas JSON cadangan yang valid.',
          'Sistem akan memvalidasi integritas data dan menampilkan perbandingan data saat ini vs data pengganti.',
          'Muncul dialog peringatan "Are You Sure? / Data Saat Ini Akan Ditimpa".',
          'Centang kotak persetujuan: "[✓] Saya yakin dan memahami bahwa data yang ada saat ini akan ditimpa."',
          'Klik tombol merah "Ya, Saya Yakin — Timpa & Pulihkan Data".',
        ],
      },
    ],
  },
  {
    id: 'lan-multi-client',
    title: '11. Jaringan Multi-Kasir LAN & Aplikasi Desktop',
    iconName: 'Network',
    badge: 'Multi-Perangkat',
    description: 'Menghubungkan banyak kasir (PC Kasir 1, Laptop Kasir 2, Tablet Kasir 3, HP Owner) dalam satu jaringan toko tanpa internet serta mode desktop mandiri.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'konsep-lan-server',
        title: 'Konsep Server Master & Terminal Klien LAN',
        summary: 'Memahami bagaimana data produk, stok, dan transaksi dibagikan antar-perangkat kasir secara real-time.',
        steps: [
          'Tentukan 1 komputer utama toko (biasanya PC Kasir 1) untuk bertindak sebagai Server Master (Host).',
          'Komputer lain (Laptop Kasir 2, Kasir 3, Tablet Pramuniaga) bertindak sebagai Terminal Klien.',
          'Semua perangkat harus terhubung ke router WiFi atau kabel LAN toko yang sama (tidak butuh kuota internet luar).',
          'Setiap penjualan di kasir manapun akan otomatis mengurangi stok di Server Master dan seluruh kasir lain.',
        ],
        tips: [
          'Gunakan router WiFi toko khusus untuk koneksi yang stabil dan bebas hambatan.',
          'Jika IP komputer Server Master berubah, terminal klien cukup memperbarui kolom URL Server di pengaturan LAN.',
        ],
        shortcuts: ['Alt + N: Server LAN'],
      },
      {
        id: 'cara-koneksi-klien',
        title: 'Langkah Menghubungkan Kasir Kedua & HP',
        summary: 'Cara cepat memasang kasir tambahan dan smartphone ke server utama toko.',
        steps: [
          'Pada PC Kasir 1 (Master), klik menu "Pusat Alat" -> "Server LAN Multi-Kasir" (atau tekan Alt + N).',
          'Salin alamat URL LAN yang tertera (contoh: http://192.168.1.105:3000) atau siapkan QR Code yang tampil di layar.',
          'Di Laptop Kasir 2 atau HP, buka browser Chrome dan ketikkan alamat tersebut atau scan QR Code langsung dengan kamera HP.',
          'Di Kasir 2, buka menu Server LAN (Alt + N), pilih peran "Terminal Klien", lalu klik "Ping" untuk menguji koneksi.',
          'Klik tombol "Tarik Seluruh Katalog dari Server Master" untuk menyinkronkan data barang toko.',
        ],
        tips: [
          'Aktifkan opsi "Auto-Sync Real-Time" di Kasir Klien agar pembaruan stok terjadi otomatis setiap beberapa detik.',
          'Pastikan Windows Firewall di PC Master mengizinkan koneksi port 3000.',
        ],
        shortcuts: ['Alt + N: Server LAN'],
      },
      {
        id: 'parkir-pesanan-bersama',
        title: 'Parkir Pesanan Bersama (Shared Order Parking)',
        summary: 'Cara memindahkan transaksi yang belum selesai dari Kasir 1 ke Kasir 2.',
        steps: [
          'Jika pelanggan di Kasir 1 ingin mengambil barang tambahan, kasir cukup menekan tombol F4 (Hold Order).',
          'Pesanan otomatis terkirim ke Server LAN dan tersimpan dalam daftar "Parkir Antar-Kasir".',
          'Kasir 2 di meja sebelah dapat membuka menu Server LAN -> Tab "Parkir Antar-Kasir", lalu klik "Buka di Kasir Ini".',
          'Kasir 2 langsung dapat melanjutkan kasir dan menerima pembayaran tanpa harus input ulang belanjaan!',
        ],
        shortcuts: ['F4: Parkir Order', 'Alt + N: Server LAN'],
      },
      {
        id: 'desktop-runner',
        title: 'Menjalankan sebagai Aplikasi Desktop Mandiri & Layar Penuh Kiosk',
        summary: 'Membuka POS tanpa bilah browser, tanpa tab, dan langsung terintegrasi dengan hardware toko.',
        steps: [
          'Di komputer Windows, cukup klik ganda file "autorun.bat" (atau "desktop.bat"). Script akan otomatis mendeteksi, menginstal, mengompilasi, dan langsung membuka kasir.',
          'Untuk menyalakan kasir otomatis setiap kali PC dinyalakan di pagi hari, klik ganda file "setup-autorun-startup.bat" lalu pilih opsi [1].',
          'Media USB / Flashdisk juga dilengkapi file "autorun.inf" standar untuk instalasi cepat.',
          'Aplikasi akan membuka jendela desktop mandiri menggunakan Chrome/Edge App Mode.',
          'Tekan F11 untuk masuk ke Mode Kiosk Layar Penuh (tanpa tombol minimize/close).',
          'Untuk keluar dari layar penuh, tekan tombol F11 kembali.',
        ],
        shortcuts: ['Alt + D: Pusat Desktop', 'F11: Layar Penuh Kiosk'],
      },
      {
        id: 'kamera-android-http',
        title: 'Penggunaan Kamera Scanner di HP Android (Solusi Koneksi HTTP / Insecure Context)',
        summary: 'Mengatasi batasan Google Chrome Android saat membuka kasir melalui alamat IP lokal (http://192.168.x.x:3000) agar kamera dapat memindai barcode barang.',
        steps: [
          'Pahami mengapa izin kamera tidak muncul: Google Chrome di Android secara ketat menonaktifkan fitur live video stream & menyembunyikan popup izin kamera pada koneksi HTTP lokal non-HTTPS demi keamanan privasi.',
          'Solusi 1 (Paling Cepat & Instan Tanpa Setting): Di jendela scanner kasir, tekan tombol "Foto Barcode (Kamera HP Android)". Sistem akan langsung membuka kamera bawaan smartphone Anda tanpa butuh izin browser, dan begitu difoto barcode otomatis terbaca serta masuk ke keranjang belanja!',
          'Solusi 2 (Untuk Live Video Streaming): Buka tab baru di Chrome HP Anda -> ketik chrome://flags/#unsafely-treat-insecure-origin-as-secure -> masukkan alamat URL kasir (contoh: http://192.168.1.15:3000) -> ubah status jadi "Enabled" -> tekan tombol "Relaunch" di pojok kanan bawah.',
          'Solusi 3 (Akses Cloud HTTPS): Buka aplikasi melalui Link Cloud HTTPS resmi toko di mana protokol keamanan HTTPS sudah aktif sehingga kamera langsung berjalan lancar tanpa konfigurasi apapun.',
        ],
        tips: [
          'Jarak foto ideal untuk barcode adalah 10–15 cm dari kemasan barang agar garis kode batang tajam dan tidak buram.',
          'Format gambar kamera beresolusi tinggi otomatis dioptimalkan oleh sistem kasir untuk deteksi secepat kilat.',
        ],
        shortcuts: ['F3: Scanner Kamera Barcode'],
      },
      {
        id: 'autoupdate-github',
        title: 'Auto-Update GitHub, Verifikasi File & Pembersihan Sistem',
        summary: 'Memperbarui sistem kasir dari repositori GitHub resmi https://github.com/fyercz/Project-POS-Retailer.git, memverifikasi integritas file, dan membersihkan file sampah tanpa risiko kehilangan data transaksi toko.',
        steps: [
          'Buka menu profil di header atas -> klik "Auto-Update GitHub Resmi" atau "Verifikasi File & Pembersihan Sistem" (atau tekan Alt + D).',
          'Pilih tab "Auto-Update GitHub" untuk melihat repositori resmi (https://github.com/fyercz/Project-POS-Retailer.git), status commit lokal, dan commit terbaru di GitHub.',
          'Klik tombol "Tarik Update Sekarang" untuk menjalankan pembaruan 1-klik via server kasir. Sistem otomatis membersihkan file sementara, menarik file via "git pull origin main", dan mengompilasi ulang kode ("npm run build").',
          'Pilih tab "Verifikasi File Sistem" untuk memindai keutuhan 28 file penting aplikasi (Core Runtime, Source Code, Skrip Desktop, PWA, dan Database).',
          'Pilih tab "Bersihkan File Sampah" untuk memindai dan menghapus berkas residu sementara (*.tmp, *.bak, *.log, cache Vite) agar penyimpanan tetap rapi.',
          'Atau unduh skrip "update.bat" (untuk Windows) atau jalankan "./update.sh" (untuk Linux/macOS) yang otomatis terkonfigurasi ke repositori resmi.',
        ],
        tips: [
          'Jaminan Keamanan Data: Database toko (transaksi, riwayat kasir, produk, stok opname, dan pengaturan) tersimpan secara independen di IndexedDB browser lokal, sehingga 100% aman dan tidak akan hilang saat file kode ditarik dari GitHub atau saat pembersihan file dijalankan.',
          'Repositori Resmi: https://github.com/fyercz/Project-POS-Retailer.git (branch main).',
        ],
        shortcuts: ['Alt + D: Pusat Desktop & Pemeliharaan Sistem'],
      },
    ],
  },
  {
    id: 'offline-cloud-sync',
    title: '12. Mode Offline-First, PWA & Sinkronisasi Awan (Cloud Sync)',
    iconName: 'Cloud',
    badge: 'Offline-First & PWA',
    description: 'Panduan operasional kasir tanpa koneksi internet, arsitektur Progressive Web App (PWA), antrean transaksi lokal (IndexedDB), dan sinkronisasi otomatis ke cloud server.',
    roles: ['Kasir', 'Supervisor', 'Manager', 'Owner'],
    topics: [
      {
        id: 'operasional-offline-kasir',
        title: 'Operasional Kasir Tanpa Internet (Offline-First POS)',
        summary: 'Kasir tetap dapat melayani penjualan dengan kecepatan penuh meskipun koneksi WiFi terputus atau internet mati total.',
        steps: [
          'Jika koneksi internet toko terputus, sistem akan otomatis menampilkan lencana status "Offline (Tersimpan Lokal)" di bilah atas header.',
          'Kasir tetap dapat mencari produk, memindai barcode, menambahkan varian produk, menerapkan diskon, dan menyelesaikan pembayaran seperti biasa.',
          'Setiap nota transaksi yang diselesaikan saat offline akan otomatis disimpan secara aman ke database lokal browser (IndexedDB) dan struk thermal tetap tercetak.',
          'Nomor antrean transaksi tertunda (Pending Sync) akan tertera di lencana cloud header.',
        ],
        tips: [
          'Jangan membersihkan data riwayat browser (Clear Browsing Data) sebelum seluruh transaksi berstatus "Tersinkron".',
          'Anda dapat menekan lencana status Cloud di header kapan saja untuk memeriksa daftar transaksi yang belum tersinkron.',
        ],
      },
      {
        id: 'mekanisme-background-sync',
        title: 'Mekanisme Sinkronisasi Otomatis & Manual (Cloud Sync)',
        summary: 'Cara kerja pengiriman transaksi tertunda ke server pusat saat internet kembali terhubung.',
        steps: [
          'Saat perangkat kasir kembali mendapatkan koneksi internet, sistem secara cerdas menjalankan "Background Sync" otomatis di latar belakang tanpa mengganggu kasir yang sedang melayani antrean.',
          'Data transaksi yang ada di antrean lokal diunggah dan diverifikasi satu per satu ke server cloud toko.',
          'Setelah seluruh antrean terverifikasi, status lencana akan berubah menjadi hijau ("Cloud Aktif & Tersinkron").',
          'Untuk memicu sinkronisasi secara manual, klik ikon Cloud di header -> klik tombol "Sinkronkan Sekarang" pada jendela modal status.',
        ],
        tips: [
          'Tersedia tombol "Simulasi Mode Offline" di modal sinkronisasi untuk melatih staf kasir baru menghadapi kondisi tanpa internet.',
        ],
      },
      {
        id: 'pencocokan-database-online',
        title: 'Pencocokan Barcode Global Online (AI Product Enrichment)',
        summary: 'Mendeteksi informasi produk baru secara otomatis dari database global internet hanya dengan memindai kode barcode.',
        steps: [
          'Saat mendaftarkan barang baru di menu Inventaris, klik tombol "Cari di Database Online" (ikon bola dunia).',
          'Tembak barcode kemasan produk atau ketik nomor barcode 8-13 digit (EAN/UPC).',
          'Sistem AI akan mencari informasi produk dari basis data produk retail global terpercaya.',
          'Nama resmi produk, merek pabrik, kategori barang, satuan kemasan, dan rekomendasi harga pasar otomatis terisi ke formulir.',
          'Klik "Gunakan Data Ini" untuk menghemat waktu input kasir.',
        ],
      },
      {
        id: 'arsitektur-pwa-cache',
        title: 'Keandalan Cache PWA & Pembaruan Sistem Otomatis',
        summary: 'Bagaimana teknologi Service Worker menjamin aplikasi kasir selalu cepat dimuat dan terhindar dari kendala layar kosong (self-healing cache).',
        steps: [
          'Aplikasi kasir ini berjalan dengan Service Worker terstandarisasi yang menerapkan strategi "Network-First" cerdas.',
          'Seluruh antarmuka kasir dicadangkan ke cache lokal perangkat sehingga aplikasi dapat dibuka seketika bahkan saat tidak ada sinyal internet sama sekali.',
          'Saat ada rilis fitur baru dari tim pengembang, sistem otomatis memperbarui aset tanpa menghapus data transaksi lokal kasir.',
          'Jika aplikasi dijalankan di dalam portal manajemen atau iframe, sistem secara mandiri membersihkan cache usang untuk menjamin data selalu mutakhir.',
        ],
      },
    ],
  },
];

export const APP_CHANGELOG: AppReleaseUpdate[] = [
  {
    version: 'v2.6.5',
    releaseDate: '23 September 2026',
    title: 'Prompt Tambah Produk Barcode Belum Terdaftar dengan Otoritas Supervisor / Owner',
    highlight: 'Penanganan cerdas barcode fisik yang belum ada di database saat scan kasir: prompt pendaftaran produk instan dengan otorisasi PIN Supervisor/Owner, pre-fill barcode otomatis, auto-enrichment AI online, dan produk langsung masuk ke keranjang belanja kasir.',
    changes: [
      {
        type: 'new',
        text: 'Pendeteksian otomatis barcode tidak terdaftar saat kasir melakukan scan via kamera HP (F3), scanner barcode gun fisik (USB/Bluetooth), maupun pencarian katalog produk.',
      },
      {
        type: 'security',
        text: 'Sistem Role-Based Authorization (RBAC): Kasir frontliner tidak dapat mendaftarkan produk baru secara mandiri tanpa memasukkan PIN otorisasi pejabat yang berada di atas kasir (Supervisor, Kepala Toko, atau Owner).',
      },
      {
        type: 'improved',
        text: 'Bagi pengguna yang sudah login dengan hak akses Supervisor / Owner / Inventory, dialog langsung memberikan persetujuan 1-klik untuk mendaftarkan barang tanpa input PIN ulang.',
      },
      {
        type: 'new',
        text: 'Pre-fill barcode instan ke formulir produk lengkap dengan pencocokan database retail online dan penambahan otomatis ke keranjang aktif kasir seketika setelah formulir disimpan.',
      },
    ],
  },
  {
    version: 'v2.6.4',
    releaseDate: '23 September 2026',
    title: 'Pusat Auto-Update Terintegrasi & Penarikan Berkas Kode Otomatis dari GitHub',
    highlight: 'Dukungan penuh auto-update kode kasir langsung dari GitHub via tab interaktif di modal aplikasi desktop, skrip update.bat otomatis 1-klik untuk Windows, script update.sh, dan jaminan integritas data kasir 100% aman di IndexedDB.',
    changes: [
      {
        type: 'new',
        text: 'Tab baru "Update dari GitHub" di Pusat Aplikasi Desktop (Alt + D) lengkap dengan pendeteksi otomatis status branch, commit terakhir, dan remote origin URL.',
      },
      {
        type: 'new',
        text: 'Fitur pembaruan 1-klik via API server lokal (/api/system/git-pull) yang otomatis menarik perubahan kode terbaru dan mengompilasi ulang paket aplikasi.',
      },
      {
        type: 'new',
        text: 'Generator berkas skrip otomatis "update.bat" untuk pembaruan cepat dari luar browser di sistem operasi Windows.',
      },
      {
        type: 'security',
        text: 'Jaminan isolasi data: Database riwayat transaksi, katalog produk, stok, dan pengaturan toko tersimpan secara permanen di IndexedDB browser sehingga tidak akan hilang atau tereset saat update kode berlangsung.',
      },
    ],
  },
  {
    version: 'v2.6.3',
    releaseDate: '22 September 2026',
    title: 'Solusi Kamera Browser Android: Pengambilan Foto Barcode Native & Bypass Insecure Context HTTP',
    highlight: 'Dukungan penuh pemindaian barcode kamera di browser HP Android pada koneksi Wi-Fi lokal (HTTP), panduan bypass chrome://flags 1-klik, dan integrasi penangkapan barcode kamera asli tanpa perlu HTTPS.',
    changes: [
      {
        type: 'fix',
        text: 'Mengatasi kendala Google Chrome Android yang mematikan prompt izin kamera pada alamat IP lokal HTTP (http://192.168.x.x:3000) dengan menyediakan pemindai foto kamera native (HTML5 Environment Capture).',
      },
      {
        type: 'new',
        text: 'Decoder barcode foto multi-engine dengan akselerasi perangkat keras Web BarcodeDetector API dan auto-downscale canvas untuk foto kamera HP beresolusi tinggi (12–50MP).',
      },
      {
        type: 'new',
        text: 'Panduan interaktif aktivasi streaming video di Chrome Android melalui bendera "chrome://flags/#unsafely-treat-insecure-origin-as-secure" lengkap dengan tombol salin URL 1-klik.',
      },
      {
        type: 'improved',
        text: 'Penambahan topik khusus Bab 11 Buku Panduan dan FAQ seputar solusi kamera HP Android pada jaringan lokal kasir.',
      },
    ],
  },
  {
    version: 'v2.6.2',
    releaseDate: '22 September 2026',
    title: 'Pembaruan Buku Panduan: Mode Offline-First PWA, Cloud Sync & Stabilitas Cache',
    highlight: 'Penambahan Bab 12 dokumentasi resmi Mode Offline-First PWA & Sinkronisasi Awan, panduan pencocokan barcode online global, optimalisasi Service Worker self-healing, serta peningkatan kompatibilitas browser.',
    changes: [
      {
        type: 'new',
        text: 'Bab 12 Buku Panduan: "Mode Offline-First, PWA & Sinkronisasi Awan (Cloud Sync)" dengan 4 topik panduan operasional kasir mandiri.',
      },
      {
        type: 'new',
        text: 'Panduan lengkap penanganan kasir saat internet padam, antrean transaksi tertunda (IndexedDB), dan cara kerja Background Sync otomatis.',
      },
      {
        type: 'new',
        text: 'Panduan integrasi pencocokan database barcode global (AI Product Enrichment) untuk percepatan pendaftaran produk baru.',
      },
      {
        type: 'improved',
        text: 'Penyempurnaan arsitektur Service Worker dengan strategi caching Network-First dan pemulihan otomatis (self-healing cache) pada lingkungan pratinjau.',
      },
      {
        type: 'fix',
        text: 'Perlindungan runtime pada API window.matchMedia dan scrollIntoView untuk keandalan maksimal di seluruh jenis peramban dan mode layar.',
      },
    ],
  },
  {
    version: 'v2.6.1',
    releaseDate: '16 September 2026',
    title: 'Panduan Khusus Supervisor: Rekap Laporan Bulanan, Audit Kas & Kontrol Toko',
    highlight: 'Penambahan Bab 9 khusus Supervisor (SOP rekap bulanan, otorisasi void & retur, audit selisih kas fisik, dan pencegahan susut barang) serta filter peran di buku panduan.',
    changes: [
      {
        type: 'new',
        text: 'Bab 9 Buku Panduan: "Panduan Khusus Supervisor: Rekap Bulanan, Audit & Kontrol Toko" dengan 6 topik SOP komprehensif.',
      },
      {
        type: 'new',
        text: 'Panduan detail langkah rekonsiliasi Omzet Kotor, Nilai Retur, HPP, Laba Kotor, dan rincian metode pembayaran non-tunai (QRIS & EDC) untuk laporan akhir bulan.',
      },
      {
        type: 'new',
        text: 'SOP resmi otorisasi kasir dengan PIN Supervisor (Void, Retur Barang, Buka Laci Kasir, dan Diskon Khusus).',
      },
      {
        type: 'improved',
        text: 'Filter navigasi peran di Buku Panduan (Semua, Kasir, Supervisor, Owner) untuk memudahkan pencarian panduan sesuai tanggung jawab staf.',
      },
      {
        type: 'improved',
        text: 'Pembaruan daftar Tanya Jawab (FAQ) khusus mengenai tugas dan hak akses supervisor.',
      },
    ],
  },
  {
    version: 'v2.6.0',
    releaseDate: '16 September 2026',
    title: 'Pusat Alat & Sistem Terpadu, Navigasi Aksi Ringkas & Buku Panduan Diperbarui',
    highlight: 'Penyatuan utilitas sistem ke dalam menu Pusat Alat, pengelompokan aksi inventaris (Opname, Logistik, Cadangan), dan pembaruan buku panduan interaktif.',
    changes: [
      {
        type: 'new',
        text: 'Menu "Pusat Alat & Sistem" terpadu di header yang merangkum Server LAN, Backup & Restore, Mode Desktop, Pengaturan Toko, Hotkeys, dan Tema.',
      },
      {
        type: 'improved',
        text: 'Pengelompokan aksi Inventaris ke dalam menu terorganisir: Opname & Audit Stok, Logistik & Faktur, serta Data & Cadangan.',
      },
      {
        type: 'improved',
        text: 'Buku Panduan Pengguna (User Manual Modal) diperbarui menyeluruh dengan scroll lancar di seluruh tab dan perangkat.',
      },
      {
        type: 'improved',
        text: 'Penyederhanaan tab Pelanggan & Member (Direktori Member, Kalkulator Poin, Riwayat Poin, Aturan Loyalitas) untuk tampilan mobile dan desktop yang bersih.',
      },
    ],
  },
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
        type: 'security',
        text: 'Dialog konfirmasi kritis "Are you sure?" dengan visual warning penimpaan data saat restore backup.',
      },
    ],
  },
];

export const USER_FAQS: UserFAQ[] = [
  {
    category: 'Supervisor & Laporan',
    question: 'Bagaimana langkah supervisor menyusun rekap laporan penjualan bulanan?',
    answer: 'Buka menu "Laporan Penjualan" -> pilih filter periode "Bulan Ini" -> tinjau rincian Omzet Kotor, Retur, Omzet Bersih, HPP, dan Laba Kotor. Selanjutnya cocokkan rincian metode pembayaran (Tunai, QRIS, EDC, Transfer) dengan setoran fisik dan mutasi bank. Terakhir, klik "Cetak Laporan POS" (format A4) atau klik "Ekspor CSV / Excel" untuk diserahkan ke Owner toko.',
  },
  {
    category: 'Supervisor & Otoritas',
    question: 'Berapa PIN default supervisor untuk otorisasi void atau retur kasir?',
    answer: 'PIN bawaan sistem untuk otorisasi supervisor adalah "9999". Namun, sangat disarankan bagi Supervisor untuk membuat PIN personal 4-digit unik di menu Pengaturan Karyawan agar tercatat jelas siapa yang memberi izin pada setiap transaksi.',
  },
  {
    category: 'Supervisor & Kasir',
    question: 'Apa yang harus dilakukan jika uang fisik laci kasir selisih saat tutup shift?',
    answer: 'Cek terlebih dahulu buku catatan pengeluaran kas operasional (petty cash) kasir. Jika selisih tetap ada, catat di berita acara Z-Report. Bila selisih kurang (shortage) bukan karena kesalahan sistem, kasir bertanggung jawab mengganti sesuai aturan toko. Jika selisih lebih (overage), periksa apakah ada transaksi non-tunai yang keliru dicatat sebagai tunai.',
  },
  {
    category: 'Supervisor & Stok',
    question: 'Seberapa sering supervisor harus melakukan Stock Opname di toko?',
    answer: 'Disarankan melakukan Stock Opname berputar (rolling audit) minimal 1 minggu sekali untuk produk bernilai tinggi (high-value) dan fast-moving, serta audit menyeluruh (Grand Opname) setiap 1 bulan sekali menjelang tutup buku bulanan.',
  },
  {
    category: 'Navigasi & Menu',
    question: 'Di mana saya menemukan menu Backup Data, Server LAN, atau Pengaturan Toko?',
    answer: 'Semua utilitas sistem disatukan ke dalam tombol "Pusat Alat" di pojok kanan atas header (ikon roda gigi). Klik tombol tersebut untuk membuka menu Server LAN, Backup & Restore, Mode Desktop, Pengaturan Struk, Hotkeys, dan Tema.',
  },
  {
    category: 'Transaksi & Kasir',
    question: 'Bagaimana jika scanner barcode tidak terbaca?',
    answer: 'Pastikan kursor kasir aktif pada kolom pencarian dengan menekan tombol F2 atau Ctrl+F. Jika menggunakan scanner kamera HP/Webcam (F3), pastikan izin akses kamera pada browser telah diizinkan (Allow) dan pencahayaan ruangan cukup terang.',
  },
  {
    category: 'Transaksi & Kasir',
    question: 'Apakah transaksi kasir bisa dilanjutkan jika internet toko mati mendadak?',
    answer: 'Tentu saja! Aplikasi POS ini mengusung arsitektur Offline-First. Seluruh transaksi kasir, katalog produk, kalkulasi diskon, dan keranjang belanja tersimpan aman di memori lokal komputer kasir dan tidak memerlukan koneksi internet untuk beroperasi.',
  },
  {
    category: 'Jaringan Multi-Kasir',
    question: 'Bisakah kasir menggunakan HP dan komputer secara bersamaan di satu toko?',
    answer: 'Bisa! Cukup hubungkan HP dan komputer ke WiFi toko yang sama. Buka menu Pusat Alat -> Server LAN (Alt+N), lalu scan QR Code yang muncul di layar komputer menggunakan kamera HP.',
  },
  {
    category: 'Keamanan Data',
    question: 'Apakah data kasir aman jika komputer utama mengalami kerusakan mendadak?',
    answer: 'Data Anda aman asalkan rutin mengunduh berkas cadangan (Backup JSON) ke Flashdisk atau cloud melalui menu Backup & Restore (F9). Selain itu, sistem menyediakan fitur Titik Pemulihan (Restore Point) lokal yang dapat dipulihkan dengan 1 klik jika ada kesalahan entri data.',
  },
  {
    category: 'Offline & Sinkronisasi',
    question: 'Bagaimana kasir mengetahui jika sistem sedang dalam mode offline?',
    answer: 'Perhatikan indikator status Cloud di pojok kanan atas bilah header. Jika berwarna oranye dengan ikon awan bergaris atau bertuliskan "Offline", sistem beroperasi penuh secara lokal. Jika berwarna hijau dengan centang ("Cloud Aktif"), koneksi internet tersambung dan data telah terverifikasi aman di cloud.',
  },
  {
    category: 'Offline & Sinkronisasi',
    question: 'Apakah transaksi yang dilakukan saat offline bisa hilang jika komputer dimatikan sebelum sinkronisasi?',
    answer: 'Tidak hilang. Seluruh transaksi kasir disimpan di IndexedDB penyimpanan permanen peramban lokal. Saat komputer dinyalakan kembali dan terhubung ke internet, transaksi tersebut akan tetap berada di antrean dan langsung disinkronkan ke server secara otomatis.',
  },
  {
    category: 'Hardware & Kamera Android',
    question: 'Mengapa kamera browser di HP Android tidak bisa, muncul koneksi tidak aman (HTTP), dan prompt "Izinkan Kamera" tidak keluar?',
    answer: 'Google Chrome di sistem Android secara ketat menonaktifkan prompt izin kamera pada alamat IP HTTP lokal (misal http://192.168.x.x:3000) demi keamanan privasi. Solusi tercepat tanpa pengaturan apapun: Tekan tombol "Foto Barcode (Kamera HP Android)" di jendela scanner kasir — kamera bawaan HP Anda akan langsung aktif untuk menjepret barcode dan produk otomatis masuk keranjang belanja. Jika Anda ingin video streaming menyala terus-menerus tanpa menekan tombol foto, buka tab baru di Chrome HP Anda, ketik "chrome://flags/#unsafely-treat-insecure-origin-as-secure", masukkan URL IP kasir, ubah status menjadi "Enabled", lalu ketuk "Relaunch". Alternatif lain, buka aplikasi melalui tautan Cloud HTTPS resmi.',
  },
  {
    category: 'Pembaruan & GitHub',
    question: 'Apakah aplikasi kasir bisa melakukan auto-update dengan menarik file dari GitHub tanpa menghapus data toko?',
    answer: 'Bisa, 100%! Aplikasi kasir Ulilmart POS telah dilengkapi fitur auto-update terintegrasi dari GitHub. Anda cukup membuka menu "Pusat Alat" -> "Aplikasi Desktop & Integrasi Hardware" (Alt + D) -> tab "Update dari GitHub", lalu klik tombol "Tarik Update Sekarang". Atau di komputer Windows, Anda cukup mengklik ganda file "update.bat". Sistem akan otomatis menjalankan git pull dan mengompilasi kode terbaru. Seluruh riwayat transaksi kasir, katalog produk, stok, dan pengaturan toko tersimpan secara terpisah di IndexedDB browser sehingga dijamin AMAN dan TIDAK AKAN HILANG setelah update.',
  },
  {
    category: 'Inventaris & Barcode',
    question: 'Bagaimana cara kerja pencocokan barcode online untuk produk baru?',
    answer: 'Buka menu Tambah Produk di Inventaris, lalu klik tombol "Cari di Database Online". Tembak barcode barang dengan scanner atau kamera. Sistem secara otomatis mencari data produk global untuk mengisi nama, kategori, merek, dan perkiraan harga jual tanpa perlu mengetik manual.',
  },
];
