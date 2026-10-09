export interface CategoryGuideItem {
  id: string;
  name: string;
  aliases: string[];
  examples: string[];
  description: string;
}

export const CATEGORY_GUIDE_DATA: CategoryGuideItem[] = [
  {
    id: 'groceries',
    name: 'Sembako & Bahan Pokok',
    aliases: ['sembako', 'bumbu', 'bahan pokok', 'beras', 'minyak', 'gula', 'tepung', 'telur', 'kecap', 'saus', 'garam', 'sambal'],
    examples: ['Minyak Goreng Bimoli 2L', 'Beras Pandan Wangi 5kg', 'Gula Gulaku 1kg', 'Kecap Bango 520ml'],
    description: 'Bahan makanan pokok, bumbu dapur, minyak, dan telur.',
  },
  {
    id: 'beverages',
    name: 'Minuman & Susu',
    aliases: ['minuman', 'susu', 'kopi', 'teh', 'jus', 'air', 'soda', 'uht', 'mineral'],
    examples: ['Aqua Botol 600ml', 'Susu Ultra Coklat 1000ml', 'Kopi Kapal Api Mix', 'Teh Pucuk 350ml'],
    description: 'Air mineral, susu cair, kopi, teh kemasan, dan jus.',
  },
  {
    id: 'snacks',
    name: 'Snack & Biskuit',
    aliases: ['snack', 'biskuit', 'wafer', 'keripik', 'cokelat', 'permen', 'kacang'],
    examples: ['Biskuit Khong Guan 1600g', 'Chitato Sapi Panggang 68g', 'Nabati Wafer Keju', 'SilverQueen 62g'],
    description: 'Makanan ringan, keripik, biskuit, wafer, permen, dan cokelat.',
  },
  {
    id: 'instant',
    name: 'Makanan Instan',
    aliases: ['instant', 'mie', 'mi', 'makanan instan', 'sarden', 'kornet', 'bubur', 'kaleng'],
    examples: ['Indomie Goreng Spesial 85g', 'Mie Sedaap Soto', 'Sarden ABC 155g', 'Kornet Pronas 198g'],
    description: 'Mie instan, bubur instan, dan makanan siap saji dalam kaleng.',
  },
  {
    id: 'fresh',
    name: 'Frozen Food & Produk Segar',
    aliases: ['fresh', 'frozen', 'beku', 'nugget', 'sosis', 'bakso', 'dimsum', 'kentang beku', 'keju', 'mentega', 'yoghurt'],
    examples: ['Fiesta Chicken Nugget 500g', 'Sosis Kanzler Singles', 'Bakso Sapi Sumber Selera', 'Keju Kraft Cheddar'],
    description: 'Olahan daging beku, sosis, nugget, dan olahan susu segar.',
  },
  {
    id: 'personal_care',
    name: 'Perawatan Tubuh',
    aliases: ['personal_care', 'perawatan', 'tubuh', 'sabun', 'sampo', 'shampo', 'zinc', 'pasta gigi', 'skincare', 'deodorant', 'parfum', 'bayi', 'baby', 'popok'],
    examples: ['Sabun Lifebuoy Total 10 110g', 'Shampo Sunsilk 170ml', 'Pasta Gigi Pepsodent 190g', 'Minyak Telon Zwitsal 100ml'],
    description: 'Sabun mandi, perawatan rambut, kebersihan gigi, dan produk bayi.',
  },
  {
    id: 'home_care',
    name: 'Kebutuhan Rumah & Pembersih',
    aliases: ['home_care', 'pembersih', 'kebersihan', 'deterjen', 'rumah', 'cuci', 'pewangi', 'karbol', 'lantai', 'nyamuk'],
    examples: ['Deterjen Rinso Molto 770g', 'Sunlight Cuci Piring 750ml', 'Wipol Karbol 780ml', 'Baygon Spray 600ml'],
    description: 'Deterjen pakaian, pembersih piring, karbol, dan kebutuhan sanitasi rumah.',
  },
  {
    id: 'atk_meds',
    name: 'ATK & Obat-obatan',
    aliases: ['atk_meds', 'atk', 'obat', 'baterai', 'medis', 'toko', 'kertas', 'pulpen'],
    examples: ['Baterai ABC Alkaline AA', 'Tolak Angin Cair Box', 'Panadol Biru 10 Kaplet', 'Buku Tulis Sinar Dunia'],
    description: 'Alat tulis kantor, perlengkapan kasir, baterai, dan obat-obatan umum.',
  },
  {
    id: 'tobacco',
    name: 'Rokok & Tembakau',
    aliases: ['tobacco', 'rokok', 'tembakau', 'cerutu', 'kretek', 'filter'],
    examples: ['Sampoerna Mild 16', 'Djarum Super 12', 'Gudang Garam Surya 16', 'Marlboro Red'],
    description: 'Rokok kretek, filter, cerutu, dan produk tembakau.',
  },
  {
    id: 'bakery_ready',
    name: 'Roti & Selai',
    aliases: ['bakery_ready', 'roti', 'selai', 'bakery', 'siap saji', 'kue', 'meses'],
    examples: ['Sari Roti Tawar Spesial', 'Selai Morin Strawberry 170g', 'Meses Ceres Classic 200g'],
    description: 'Roti tawar, roti manis, selai, dan olesan sarapan.',
  },
];

export const CATEGORY_GUIDE_CSV = `kode_kategori,nama_kategori,kata_kunci_dikenali,contoh_produk
groceries,Sembako & Bahan Pokok,"sembako, bumbu, bahan pokok, beras, minyak, gula, tepung, telur, kecap, saus, garam, sambal","Minyak Goreng Bimoli 2L, Beras Pandan Wangi 5kg, Gula Gulaku 1kg"
beverages,Minuman & Susu,"minuman, susu, kopi, teh, jus, air, soda, uht, mineral","Aqua Botol 600ml, Susu Ultra Coklat 1000ml, Kopi Kapal Api Mix"
snacks,Snack & Biskuit,"snack, biskuit, wafer, keripik, cokelat, permen, kacang","Biskuit Khong Guan 1600g, Chitato Sapi Panggang, SilverQueen 62g"
instant,Makanan Instan,"instant, mie, mi, makanan instan, sarden, kornet, bubur, kaleng","Indomie Goreng Spesial 85g, Mie Sedaap Soto, Sarden ABC 155g"
fresh,Frozen Food & Segar,"fresh, frozen, beku, nugget, sosis, bakso, dimsum, kentang beku, keju, mentega, yoghurt","Fiesta Chicken Nugget 500g, Sosis Kanzler Singles, Keju Kraft"
personal_care,Perawatan Tubuh,"personal_care, perawatan, tubuh, sabun, sampo, shampo, zinc, pasta gigi, skincare, parfum, bayi, popok","Sabun Lifebuoy 110g, Shampo Sunsilk 170ml, Pepsodent 190g"
home_care,Kebutuhan Rumah,"home_care, pembersih, kebersihan, deterjen, rumah, cuci, pewangi, karbol, lantai, nyamuk","Deterjen Rinso 770g, Sunlight 750ml, Wipol Karbol 780ml"
atk_meds,ATK & Obat-obatan,"atk_meds, atk, obat, baterai, medis, kertas, pulpen","Baterai ABC Alkaline AA, Tolak Angin Cair, Panadol Biru"
tobacco,Rokok & Tembakau,"tobacco, rokok, tembakau, cerutu, kretek, filter","Sampoerna Mild 16, Djarum Super 12, Gudang Garam Surya 16"
bakery_ready,Roti & Selai,"bakery_ready, roti, selai, bakery, siap saji, kue, meses","Sari Roti Tawar Spesial, Selai Morin Strawberry 170g"`;

export const CATEGORY_GUIDE_TXT = `================================================================================
PANDUAN FORMAT KATEGORI PRODUK SISTEM KASIR RITEL & POS
================================================================================

Format Kolom CSV yang Direkomendasikan:
barcode,nama_produk,harga_beli,harga_jual,stok,kategori

Catatan:
1. Kolom "kategori" bersifat opsional namun sangat dianjurkan.
2. Anda dapat menulis KODE KATEGORI (misal: "groceries") atau NAMA/KATA KUNCI BAHASA INDONESIA (misal: "Sembako").
3. Jika kolom kategori dikosongkan, sistem secara pintar akan mendeteksi kategori berdasarkan nama produk secara otomatis.
4. Kolom SATUAN sudah ditiadakan karena seluruh produk telah dikemas siap jual.

--------------------------------------------------------------------------------
DAFTAR KATEGORI RESMI & KATA KUNCI YANG TERDETEKSI SISTEM:
--------------------------------------------------------------------------------

1. GROCERIES (Sembako & Bahan Pokok)
   - Kode Kategori : groceries
   - Kata Kunci   : sembako, bumbu, bahan pokok, beras, minyak, gula, tepung, telur, kecap, saus, garam, sambal
   - Contoh Produk : Minyak Goreng Bimoli 2L, Beras Pandan Wangi 5kg, Kecap Bango 520ml

2. BEVERAGES (Minuman & Susu)
   - Kode Kategori : beverages
   - Kata Kunci   : minuman, susu, kopi, teh, jus, air, soda, uht, mineral
   - Contoh Produk : Aqua Botol 600ml, Susu Ultra Coklat 1000ml, Kopi Kapal Api Mix

3. SNACKS (Snack & Biskuit)
   - Kode Kategori : snacks
   - Kata Kunci   : snack, biskuit, wafer, keripik, cokelat, permen, kacang
   - Contoh Produk : Biskuit Khong Guan 1600g, Chitato Sapi Panggang, SilverQueen 62g

4. INSTANT (Makanan Instan)
   - Kode Kategori : instant
   - Kata Kunci   : instant, mie, mi, makanan instan, sarden, kornet, bubur, kaleng
   - Contoh Produk : Indomie Goreng Spesial 85g, Mie Sedaap Soto, Sarden ABC 155g

5. FRESH (Frozen Food & Produk Segar)
   - Kode Kategori : fresh
   - Kata Kunci   : fresh, frozen, beku, nugget, sosis, bakso, dimsum, kentang beku, keju, mentega, yoghurt
   - Contoh Produk : Fiesta Chicken Nugget 500g, Sosis Kanzler Singles, Keju Kraft

6. PERSONAL_CARE (Perawatan Tubuh)
   - Kode Kategori : personal_care
   - Kata Kunci   : personal_care, perawatan, tubuh, sabun, sampo, shampo, zinc, pasta gigi, skincare, parfum, bayi, popok
   - Contoh Produk : Sabun Lifebuoy 110g, Shampo Sunsilk 170ml, Pepsodent 190g

7. HOME_CARE (Kebutuhan Rumah & Pembersih)
   - Kode Kategori : home_care
   - Kata Kunci   : home_care, pembersih, kebersihan, deterjen, rumah, cuci, pewangi, karbol, lantai, nyamuk
   - Contoh Produk : Deterjen Rinso 770g, Sunlight 750ml, Wipol Karbol 780ml

8. ATK_MEDS (ATK & Obat-obatan)
   - Kode Kategori : atk_meds
   - Kata Kunci   : atk_meds, atk, obat, baterai, medis, kertas, pulpen
   - Contoh Produk : Baterai ABC Alkaline AA, Tolak Angin Cair, Panadol Biru

9. TOBACCO (Rokok & Tembakau)
   - Kode Kategori : tobacco
   - Kata Kunci   : tobacco, rokok, tembakau, cerutu, kretek, filter
   - Contoh Produk : Sampoerna Mild 16, Djarum Super 12, Gudang Garam Surya 16

10. BAKERY_READY (Roti & Selai)
    - Kode Kategori : bakery_ready
    - Kata Kunci   : bakery_ready, roti, selai, bakery, siap saji, kue, meses
    - Contoh Produk : Sari Roti Tawar Spesial, Selai Morin Strawberry 170g

--------------------------------------------------------------------------------
CONTOH BARIS DATA CSV YANG SIAP DI-IMPORT:
--------------------------------------------------------------------------------
barcode,nama_produk,harga_beli,harga_jual,stok,kategori
8999999190112,Indomie Goreng Spesial 80g,2700,3100,120,instant
8992775211029,Bimoli Minyak Goreng 2L,33500,38500,36,sembako
8991001100223,Kopi Kapal Api Special Mix 24g,1100,1500,200,beverages
8999999052212,Sabun Lifebuoy Total 10 110g,3800,4800,72,personal_care
8991234567890,Beras Pandan Wangi 5kg,68000,78000,25,groceries
`;

export function downloadCategoryGuideCSV() {
  const blob = new Blob([CATEGORY_GUIDE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'format_kategori_produk.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCategoryGuideTXT() {
  const blob = new Blob([CATEGORY_GUIDE_TXT], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'panduan_format_kategori_produk.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
