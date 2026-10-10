/**
 * AI Product Category Mapper Utility
 * Memetakan kategori produk ritel secara otomatis dan cerdas berbasis Google Gemini AI
 * Dilengkapi fallback heuristik instan untuk ketahanan offline / tanpa jaringan.
 */

import { ProductCategory } from '../types';

export interface CategoryMappingResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
  suggestedBrand?: string;
  suggestedUnit?: string;
  source: 'gemini-ai' | 'heuristic-engine' | 'client-rules';
}

// Client-side instant rules for immediate response or offline fallback
export function clientInferCategory(
  productName: string,
  categories: ProductCategory[] = []
): CategoryMappingResult {
  const n = (productName || '').toLowerCase().trim();

  // Helper to get category name by ID
  const getCatName = (id: string, fallback: string) => {
    const found = categories.find((c) => c.id === id);
    return found ? found.name : fallback;
  };

  // Detect brand
  let detectedBrand = '';
  const knownBrands = [
    'indomie', 'mie sedaap', 'sarimi', 'pop mie', 'samyang', 'supermi',
    'aqua', 'le minerale', 'cleo', 'nestle', 'vit', 'teh pucuk', 'sosro', 'sariwangi',
    'kapal api', 'nescafe', 'good day', 'torabika', 'luwak', 'ultra milk', 'frisian flag',
    'indomilk', 'dancow', 'bear brand', 'pocari sweat', 'buavita', 'floridina',
    'chitato', 'taro', 'lays', 'cheetos', 'qtela', 'potabee', 'tango', 'nabati',
    'roma', 'oreo', 'silverqueen', 'kitkat', 'beng beng', 'chocolatos', 'garuda', 'dua kelinci',
    'bimoli', 'filma', 'sunco', 'tropical', 'sania', 'fortune', 'rose brand', 'gulaku',
    'bango', 'abc', 'royco', 'masako', 'sasa', 'ladaku', 'blue band',
    'fiesta', 'champ', 'so good', 'kanzler', 'belfoods', 'cedea',
    'lifebuoy', 'dettol', 'biore', 'nuvo', 'shinzui', 'dove', 'pantene', 'clear',
    'sunsilk', 'zinc', 'pepsodent', 'ciptadent', 'close up', 'sensodyne', 'formula',
    'rexona', 'axe', 'nivea', 'vaseline', 'marina', 'wardah', 'emina', 'kahf', 'ponds', 'garnier',
    'rinso', 'daia', 'so klin', 'attack', 'molto', 'downy', 'sunlight', 'mama lemon',
    'super pell', 'wipol', 'bayclin', 'baygon', 'hit', 'vape', 'paseo', 'nice', 'jolly',
    'sari roti', 'aoka', 'mr bread', 'morin', 'ceres',
    'sampoerna', 'dji sam soe', 'gudang garam', 'surya', 'djarum', 'marlboro', 'esse',
    'panadol', 'bodrex', 'tolak angin', 'promag', 'minyak kayu putih', 'cap lang', 'hansaplast',
    'sidu', 'sinar dunia', 'pilot', 'standard', 'faber castell', 'energizer'
  ];

  for (const b of knownBrands) {
    if (n.includes(b)) {
      detectedBrand = b.charAt(0).toUpperCase() + b.slice(1);
      break;
    }
  }

  // Detect Packaging Unit
  let detectedUnit = 'pcs';
  if (n.includes('24 btl') || n.includes('40 pcs') || n.includes('karton') || n.includes('dus') || n.includes('box')) detectedUnit = 'dus';
  else if (n.includes('renceng') || n.includes('10 sch') || n.includes('12 sch')) detectedUnit = 'renceng';
  else if (n.includes('slop')) detectedUnit = 'slop';
  else if (n.includes('bal') || n.includes('karung') || n.includes('sak')) detectedUnit = 'sak';
  else if (n.includes('pouch') || n.includes('refill') || n.includes('isi ulang')) detectedUnit = 'pouch';
  else if (n.includes('botol') || n.includes('btl')) detectedUnit = 'botol';
  else if (n.includes('kaleng') || n.includes('can')) detectedUnit = 'kaleng';
  else if (n.includes('sachet') || n.includes('sch')) detectedUnit = 'sachet';
  else if (n.includes('bungkus') || n.includes('bks')) detectedUnit = 'bungkus';
  else if (n.includes('pak') || n.includes('pack')) detectedUnit = 'pak';

  // Instant Noodles & Canned Foods
  if (
    n.includes('indomie') || n.includes('mie ') || n.includes('mi ') || n.includes('sedaap goreng') ||
    n.includes('sedaap kuah') || n.includes('sarimi') || n.includes('supermi') || n.includes('pop mie') ||
    n.includes('samyang') || n.includes('bihun') || n.includes('soun') || n.includes('sarden') ||
    n.includes('kornet') || n.includes('bubur instan') || n.includes('cup noodle') || n.includes('mie instan')
  ) {
    return {
      categoryId: 'instant',
      categoryName: getCatName('instant', 'Makanan Instan'),
      confidence: 0.96,
      reasoning: 'Produk mie instan, makanan kaleng, atau hidangan saji cepat.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit === 'pcs' ? 'bungkus' : detectedUnit,
      source: 'client-rules',
    };
  }

  // Sembako & Cooking Ingredients
  if (
    n.includes('beras') || n.includes('minyak') || n.includes('bimoli') || n.includes('filma') ||
    n.includes('sunco') || n.includes('tropical') || n.includes('sania') || n.includes('fortune') ||
    n.includes('gula') || n.includes('gulaku') || n.includes('tepung') || n.includes('terigu') ||
    n.includes('tapioka') || n.includes('telur') || n.includes('garam') || n.includes('santan') ||
    n.includes('kara') || n.includes('kecap') || n.includes('bango') || n.includes('saus') ||
    n.includes('saos') || n.includes('bumbu') || n.includes('royco') || n.includes('masako') ||
    n.includes('ladaku') || n.includes('ajinomoto') || n.includes('sasa') || n.includes('mentega') ||
    n.includes('blue band') || n.includes('palmia') || n.includes('margarin') || n.includes('cuka') ||
    n.includes('terasi') || n.includes('tauco') || n.includes('sambal terasi')
  ) {
    return {
      categoryId: 'groceries',
      categoryName: getCatName('groceries', 'Sembako & Bahan Pokok'),
      confidence: 0.95,
      reasoning: 'Kebutuhan pokok dapur, sembako, minyak, beras, atau bumbu masak.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit,
      source: 'client-rules',
    };
  }

  // Beverages & Dairy
  if (
    n.includes('aqua') || n.includes('le minerale') || n.includes('cleo') || n.includes('mineral') ||
    n.includes('susu') || n.includes('milk') || n.includes('ultra') || n.includes('frisian flag') ||
    n.includes('indomilk') || n.includes('dancow') || n.includes('bear brand') || n.includes('milo') ||
    n.includes('kopi') || n.includes('coffee') || n.includes('kapal api') || n.includes('nescafe') ||
    n.includes('good day') || n.includes('torabika') || n.includes('luwak') || n.includes('teh') ||
    n.includes('tea') || n.includes('pucuk') || n.includes('sosro') || n.includes('sariwangi') ||
    n.includes('tong tji') || n.includes('pocari') || n.includes('mizone') || n.includes('floridina') ||
    n.includes('buavita') || n.includes('jus') || n.includes('juice') || n.includes('coca cola') ||
    n.includes('sprite') || n.includes('fanta') || n.includes('soda') || n.includes('sirup') ||
    n.includes('marjan') || n.includes('you c1000') || n.includes('hydro coco') || n.includes('kratingdaeng') ||
    n.includes('adem sari') || n.includes('larutan')
  ) {
    return {
      categoryId: 'beverages',
      categoryName: getCatName('beverages', 'Minuman & Susu'),
      confidence: 0.95,
      reasoning: 'Produk minuman kemasan, air mineral, susu olahan, teh, atau kopi.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit === 'pcs' ? 'botol' : detectedUnit,
      source: 'client-rules',
    };
  }

  // Bakery & Bread
  if (
    n.includes('roti') || n.includes('sari roti') || n.includes('aoka') || n.includes('mr bread') ||
    n.includes('paroti') || n.includes('tawar') || n.includes('sobek') || n.includes('selai') ||
    n.includes('morin') || n.includes('ceres') || n.includes('meses') || n.includes('donat') ||
    n.includes('cake') || n.includes('bolu')
  ) {
    return {
      categoryId: 'bakery_ready',
      categoryName: getCatName('bakery_ready', 'Roti & Selai'),
      confidence: 0.94,
      reasoning: 'Produk roti tawar/manis, olahan bakery, selai, dan olesan roti.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit === 'pcs' ? 'bungkus' : detectedUnit,
      source: 'client-rules',
    };
  }

  // Frozen & Fresh Foods
  if (
    n.includes('nugget') || n.includes('sosis') || n.includes('bakso') || n.includes('fiesta') ||
    n.includes('champ') || n.includes('so good') || n.includes('kanzler') || n.includes('belfoods') ||
    n.includes('cedea') || n.includes('dimsum') || n.includes('kentang beku') || n.includes('french fries') ||
    n.includes('daging beku') || n.includes('keju') || n.includes('kraft') || n.includes('prochiz') ||
    n.includes('yoghurt') || n.includes('cimory') || n.includes('otak-otak') || n.includes('frozen')
  ) {
    return {
      categoryId: 'fresh',
      categoryName: getCatName('fresh', 'Frozen Food'),
      confidence: 0.94,
      reasoning: 'Makanan beku olahan (nugget/sosis/bakso), daging dingin, atau olahan keju.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit === 'pcs' ? 'pak' : detectedUnit,
      source: 'client-rules',
    };
  }

  // Home Care & Cleaning
  if (
    n.includes('deterjen') || n.includes('detergent') || n.includes('rinso') || n.includes('daia') ||
    n.includes('so klin') || n.includes('attack') || n.includes('molto') || n.includes('downy') ||
    n.includes('kispray') || n.includes('rapika') || n.includes('sunlight') || n.includes('mama lemon') ||
    n.includes('cuci piring') || n.includes('pembersih lantai') || n.includes('super pell') ||
    n.includes('wipol') || n.includes('sos ') || n.includes('vixal') || n.includes('harpic') ||
    n.includes('bayclin') || n.includes('proclin') || n.includes('baygon') || n.includes('hit ') ||
    n.includes('vape ') || n.includes('kamper') || n.includes('stella') || n.includes('glade') ||
    n.includes('tisu') || n.includes('tissue') || n.includes('paseo') || n.includes('nice') ||
    n.includes('jolly') || n.includes('sabun cuci') || n.includes('pewangi pakaian')
  ) {
    return {
      categoryId: 'home_care',
      categoryName: getCatName('home_care', 'Kebutuhan Rumah'),
      confidence: 0.95,
      reasoning: 'Pembersih rumah tangga, deterjen pakaian, sabun piring, atau tisu.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit,
      source: 'client-rules',
    };
  }

  // Personal Care & Toiletries
  if (
    n.includes('sabun mandi') || n.includes('body wash') || n.includes('lifebuoy') || n.includes('dettol') ||
    n.includes('biore') || n.includes('lux') || n.includes('giv') || n.includes('nuvo') ||
    n.includes('shinzui') || n.includes('dove') || n.includes('sampo') || n.includes('shampoo') ||
    n.includes('pantene') || n.includes('clear') || n.includes('sunsilk') || n.includes('zinc') ||
    n.includes('rejoice') || n.includes('head & shoulders') || n.includes('pasta gigi') ||
    n.includes('pepsodent') || n.includes('ciptadent') || n.includes('close up') || n.includes('sensodyne') ||
    n.includes('sikat gigi') || n.includes('formula') || n.includes('deodorant') || n.includes('rexona') ||
    n.includes('axe') || n.includes('nivea') || n.includes('vaseline') || n.includes('marina') ||
    n.includes('citra') || n.includes('wardah') || n.includes('emina') || n.includes('kahf') ||
    n.includes('ponds') || n.includes('garnier') || n.includes('facial foam') || n.includes('facial wash') ||
    n.includes('pembalut') || n.includes('charm') || n.includes('laurier') || n.includes('softex') ||
    n.includes('popok') || n.includes('mamy poko') || n.includes('sweety') || n.includes('pampers') ||
    n.includes('zwitsal') || n.includes('cussons') || n.includes('baby') || n.includes('bayi')
  ) {
    return {
      categoryId: 'personal_care',
      categoryName: getCatName('personal_care', 'Perawatan Tubuh'),
      confidence: 0.95,
      reasoning: 'Produk kebersihan tubuh, perawatan rambut, kulit, kosmetik, atau perawatan bayi.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit,
      source: 'client-rules',
    };
  }

  // Tobacco & Cigarettes
  if (
    n.includes('rokok') || n.includes('sampoerna') || n.includes('a mild') || n.includes('dji sam soe') ||
    n.includes('234') || n.includes('magnum') || n.includes('gudang garam') || n.includes('surya') ||
    n.includes('djarum') || n.includes('super') || n.includes('la lights') || n.includes('la bold') ||
    n.includes('marlboro') || n.includes('dunhill') || n.includes('esse') || n.includes('camel') ||
    n.includes('tembakau') || n.includes('cerutu') || n.includes('filter') || n.includes('kretek') ||
    n.includes('korek api') || n.includes('tokai') || n.includes('cricket')
  ) {
    return {
      categoryId: 'tobacco',
      categoryName: getCatName('tobacco', 'Rokok & Tembakau'),
      confidence: 0.96,
      reasoning: 'Produk rokok, tembakau, cerutu, atau perlengkapan rokok.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit === 'pcs' ? 'bungkus' : detectedUnit,
      source: 'client-rules',
    };
  }

  // ATK, OTC Medicines & Accessories
  if (
    n.includes('buku') || n.includes('sidu') || n.includes('sinar dunia') || n.includes('kiky') ||
    n.includes('pulpen') || n.includes('ballpoint') || n.includes('pilot') || n.includes('standard') ||
    n.includes('faster') || n.includes('pensil') || n.includes('faber') || n.includes('penghapus') ||
    n.includes('spidol') || n.includes('tipe-x') || n.includes('lakban') || n.includes('solasi') ||
    n.includes('baterai') || n.includes('battery') || n.includes('abc alkaline') || n.includes('energizer') ||
    n.includes('panadol') || n.includes('paracetamol') || n.includes('bodrex') || n.includes('oskadon') ||
    n.includes('tolak angin') || n.includes('antangin') || n.includes('promag') || n.includes('mylanta') ||
    n.includes('diapet') || n.includes('entrostop') || n.includes('hansaplast') || n.includes('betadine') ||
    n.includes('minyak kayu putih') || n.includes('cap lang') || n.includes('freshcare') ||
    n.includes('safe care') || n.includes('salonpas') || n.includes('koyo') || n.includes('kertas')
  ) {
    return {
      categoryId: 'atk_meds',
      categoryName: getCatName('atk_meds', 'ATK, Obat & Lainnya'),
      confidence: 0.93,
      reasoning: 'Alat tulis kantor, perlengkapan sekolah, obat warung/OTC, atau baterai.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit,
      source: 'client-rules',
    };
  }

  // Snacks & Biscuits
  if (
    n.includes('snack') || n.includes('biskuit') || n.includes('wafer') || n.includes('keripik') ||
    n.includes('chitato') || n.includes('taro') || n.includes('lays') || n.includes('cheetos') ||
    n.includes('chiki') || n.includes('ciki') || n.includes('qtela') || n.includes('kusuka') ||
    n.includes('potabee') || n.includes('piattos') || n.includes('tango') || n.includes('nabati') ||
    n.includes('roma') || n.includes('malkist') || n.includes('kelapa') || n.includes('marie') ||
    n.includes('oreo') || n.includes('regal') || n.includes('khong guan') || n.includes('monde') ||
    n.includes('good time') || n.includes('cokelat') || n.includes('chocolate') || n.includes('silverqueen') ||
    n.includes('delfi') || n.includes('cadbury') || n.includes('kitkat') || n.includes('beng beng') ||
    n.includes('chocolatos') || n.includes('permen') || n.includes('candy') || n.includes('kopiko') ||
    n.includes('relaxa') || n.includes('yupi') || n.includes('mentos') || n.includes('kacang') ||
    n.includes('garuda') || n.includes('dua kelinci') || n.includes('sukro')
  ) {
    return {
      categoryId: 'snacks',
      categoryName: getCatName('snacks', 'Snack & Biskuit'),
      confidence: 0.94,
      reasoning: 'Makanan ringan, biskuit renyah, wafer, cokelat, atau permen.',
      suggestedBrand: detectedBrand,
      suggestedUnit: detectedUnit === 'pcs' ? 'bungkus' : detectedUnit,
      source: 'client-rules',
    };
  }

  // Default fallback to groceries
  return {
    categoryId: 'groceries',
    categoryName: getCatName('groceries', 'Sembako & Bahan Pokok'),
    confidence: 0.5,
    reasoning: 'Dipetakan secara umum ke Sembako & Bahan Pokok.',
    suggestedBrand: detectedBrand,
    suggestedUnit: detectedUnit,
    source: 'client-rules',
  };
}

/**
 * Request AI Category Mapping from backend, with instant fallback
 */
export async function mapCategoryWithAI(
  productName: string,
  categories: ProductCategory[] = [],
  brand?: string,
  signal?: AbortSignal
): Promise<CategoryMappingResult> {
  const trimmed = (productName || '').trim();
  if (!trimmed) {
    return clientInferCategory('', categories);
  }

  try {
    const res = await fetch('/api/ai/map-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: trimmed,
        brand: brand || '',
        categories: categories.map((c) => ({ id: c.id, name: c.name, description: c.description })),
      }),
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data && data.data.categoryId) {
        return {
          categoryId: data.data.categoryId,
          categoryName: data.data.categoryName,
          confidence: data.data.confidence ?? 0.95,
          reasoning: data.data.reasoning ?? 'Dipetakan secara otomatis oleh Gemini AI.',
          suggestedBrand: data.data.suggestedBrand || '',
          suggestedUnit: data.data.suggestedUnit || 'pcs',
          source: data.data.source || 'gemini-ai',
        };
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    // Network error or offline
  }

  // Fallback to client rules
  return clientInferCategory(trimmed, categories);
}

/**
 * Batch Category Mapping for multiple products
 */
export async function batchMapCategoriesWithAI(
  products: Array<{ id: string; name: string; brand?: string; categoryId?: string }>,
  categories: ProductCategory[] = []
): Promise<Array<{ id: string; categoryId: string; categoryName: string; confidence: number; reasoning: string; previousCategoryId?: string }>> {
  if (!products || products.length === 0) return [];

  try {
    const res = await fetch('/api/ai/batch-map-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: products.map((p) => ({ id: p.id, name: p.name, brand: p.brand, currentCategoryId: p.categoryId })),
        categories: categories.map((c) => ({ id: c.id, name: c.name, description: c.description })),
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.mappings)) {
        return json.mappings;
      }
    }
  } catch {
    // fallback
  }

  // Client-side batch fallback
  return products.map((p) => {
    const mapped = clientInferCategory(p.name, categories);
    return {
      id: p.id,
      categoryId: mapped.categoryId,
      categoryName: mapped.categoryName,
      confidence: mapped.confidence,
      reasoning: mapped.reasoning,
      previousCategoryId: p.categoryId,
    };
  });
}
