const fs = require('fs');

const rawCsv = fs.readFileSync('raw_data.csv', 'utf8');
const lines = rawCsv.split('\n');

const categoryMap = {
  'sembako': 'Sembako & Bumbu Dapur',
  'minuman': 'Minuman & Susu',
  'snack': 'Snack & Biskuit',
  'makanan': 'Makanan Instan & Kaleng',
  'segar': 'Produk Segar & Roti',
  'tubuh': 'Perawatan Tubuh & Bayi',
  'rumah': 'Pembersih Rumah & Kebersihan',
  'atk': 'ATK, Obat & Lainnya'
};

function cleanName(name) {
  let n = name.trim();
  // Gramasi & Satuan standardize
  n = n.replace(/(\d+)\s*GR\b/gi, '$1g');
  n = n.replace(/(\d+)\s*G\b/gi, '$1g');
  n = n.replace(/(\d+)\s*ML\b/gi, '$1ml');
  n = n.replace(/(\d+)\s*LMBR\b/gi, '$1 Lembar');
  n = n.replace(/(\d+)\s*LBR\b/gi, '$1 Lembar');
  n = n.replace(/(\d+)\s*PADS\b/gi, '$1 Pads');
  n = n.replace(/(\d+)\s*TBLT\b/gi, '$1 Tablet');
  n = n.replace(/(\d+)\s*TBLET\b/gi, '$1 Tablet');
  n = n.replace(/(\d+)\s*TBLET\b/gi, '$1 Tablet');
  n = n.replace(/(\d+)\s*SCH\b/gi, '$1 Sachet');
  n = n.replace(/(\d+)\s*SCT\b/gi, '$1 Sachet');
  n = n.replace(/(\d+)\s*P\b/gi, '$1 Pcs');
  n = n.replace(/(\d+)\s*S\b/gi, '$1s');
  n = n.replace(/(\d+)\s*PCS\b/gi, '$1 Pcs');
  n = n.replace(/(\d+)\s*PC\b/gi, '$1 Pcs');

  // Spelling corrections
  const replacements = [
    [/\bREFFIL\b/gi, 'Refill'],
    [/\bREFIL\b/gi, 'Refill'],
    [/\bREFF\b/gi, 'Refill'],
    [/\bRFL\b/gi, 'Refill'],
    [/\bEXTRA PDS\b/gi, 'Extra Pedas'],
    [/\bSBL EXTRA PEDAS\b/gi, 'Sambal Extra Pedas'],
    [/\bSMBAL AYM GORENG\b/gi, 'Sambal Ayam Goreng'],
    [/\bAYM\b/gi, 'Ayam'],
    [/\bBWG\b/gi, 'Bawang'],
    [/\bBWNG\b/gi, 'Bawang'],
    [/\bCOFFE\b/gi, 'Coffee'],
    [/\bBLUBERRY\b/gi, 'Blueberry'],
    [/\bBLUBERI\b/gi, 'Blueberry'],
    [/\bBLACBERY\b/gi, 'Blackberry'],
    [/\bFRUTYROLL\b/gi, 'Fruity Roll'],
    [/\bMANGGO\b/gi, 'Mango'],
    [/\bMAGARIN\b/gi, 'Margarin'],
    [/\bMARGARINE\b/gi, 'Margarin'],
    [/\bYOGURD\b/gi, 'Yogurt'],
    [/\bYUGURT\b/gi, 'Yogurt'],
    [/\bDOBEL TIP\b/gi, 'Double Tape'],
    [/\bDOBLE SIDE TAPE\b/gi, 'Double Sided Tape'],
    [/\bLIQ GLUE\b/gi, 'Liquid Glue'],
    [/\bREFIL CUTTER\b/gi, 'Refill Cutter'],
    [/\bSOLASI\b/gi, 'Isolasi'],
    [/\bSTROBERI\b/gi, 'Strawberry'],
    [/\bSTROBERY\b/gi, 'Strawberry'],
    [/\bSTROWBERY\b/gi, 'Strawberry'],
    [/\bSTROWNERI\b/gi, 'Strawberry'],
    [/\bSTRWBRY\b/gi, 'Strawberry'],
    [/\bSTRW\b/gi, 'Strawberry'],
    [/\bSTRO\b/gi, 'Strawberry'],
    [/\bCOKLT\b/gi, 'Cokelat'],
    [/\bCOKLAT\b/gi, 'Cokelat'],
    [/\bCOKELAT\b/gi, 'Cokelat'],
    [/\bCHOKLAT\b/gi, 'Cokelat'],
    [/\bCKLT\b/gi, 'Cokelat'],
    [/\bCHO\b/gi, 'Cokelat'],
    [/\bCHOCO\b/gi, 'Cokelat'],
    [/\bVANILA\b/gi, 'Vanilla'],
    [/\bJEUK\b/gi, 'Jeruk'],
    [/\bORANG\b/gi, 'Orange'],
    [/\bSPSIAL\b/gi, 'Spesial'],
    [/\bROMANTC\b/gi, 'Romantic'],
    [/\bGRH\b/gi, 'Gurih'],
    [/\bMASUK ANGIN CAIR 15M\b/gi, 'Masuk Angin Cair 15ml'],
    [/\bHAZENUT\b/gi, 'Hazelnut'],
    [/\bMACHA\b/gi, 'Matcha'],
    [/\bCHESSE\b/gi, 'Cheese'],
    [/\bBROW SUGAR\b/gi, 'Brown Sugar'],
    [/\bMARSMALLOW\b/gi, 'Marshmallow'],
    [/\bCUSSONS\b/gi, 'Cussons'],
    [/\bCUSSANS\b/gi, 'Cussons'],
    [/\bCUSSON\b/gi, 'Cussons'],
    [/\bCUTTON\b/gi, 'Cotton'],
    [/\bDEWANATARA\b/gi, 'Dewantara'],
    [/\bESELON\b/gi, 'Echelon'],
    [/\bFABER CASTEL\b/gi, 'Faber-Castell'],
    [/\bFABER CASTELL\b/gi, 'Faber-Castell'],
    [/\bFRISIANT\b/gi, 'Frisian Flag'],
    [/\bFRUTI TEA\b/gi, 'Fruit Tea'],
    [/\bINDOFFOD\b/gi, 'Indofood'],
    [/\bINDOMI\b/gi, 'Indomie'],
    [/\bCRANCHOX\b/gi, 'Crunchy'],
    [/\bCRANC\b/gi, 'Crunch'],
    [/\bCRANCH\b/gi, 'Crunch'],
    [/\bSEDAAAP\b/gi, 'Sedaap'],
    [/\bSINZHUI\b/gi, 'Shinzui'],
    [/\bSHINZU\'I\b/gi, 'Shinzui'],
    [/\bNUTRINOOST\b/gi, 'Nutriboost'],
    [/\bKISPRAY BLUIS\b/gi, 'Kispray Blue'],
    [/\bKISPRAY SEGERIS\b/gi, 'Kispray Segar'],
    [/\bKODOMO melon\b/gi, 'Kodomo Melon'],
    [/\bKODOMO SAMPO\b/gi, 'Kodomo Shampo'],
    [/\bKODOMO TP\b/gi, 'Kodomo Toothpaste'],
    [/\bKODOMO PASTA\b/gi, 'Kodomo Pasta Gigi'],
    [/\bLASEGAR JERUK NPS\b/gi, 'Lasegar Jeruk Nipis'],
    [/\bMIGIC\b/gi, 'Magic'],
    [/\bNYAM NTAM\b/gi, 'Nyam Nyam'],
    [/\bNYAM NYAMBUBBLE\b/gi, 'Nyam Nyam Bubble'],
    [/\bPOPPINS\b/gi, 'Poppins'],
    [/\bPROMINA PUFFS\b/gi, 'Promina Puffs'],
    [/\bPTN COND\b/gi, 'Pantene Conditioner'],
    [/\bROTCO\b/gi, 'Royco'],
    [/\bSANCKIT\b/gi, 'Snackit'],
    [/\bSO GOOD SOSIS\b/gi, 'So Good Sosis'],
    [/\bSOKLIN\b/gi, 'So Klin'],
    [/\bSOFFELL\b/gi, 'Soffell'],
    [/\bSOFFEL\b/gi, 'Soffell'],
    [/\bSOSOFT\b/gi, 'So Soft'],
    [/\bT-SOFT\b/gi, 'T-Soft'],
    [/\bTEXAASS\b/gi, 'Texas'],
    [/\bTIMTAM\b/gi, 'Tim Tam'],
    [/\bVIXAL PEMBERSIH PORSELEN 200M\b/gi, 'Vixal Pembersih Porselen 200ml'],
    [/\bWAFELLO\b/gi, 'Wafello'],
    [/\bWAFELO\b/gi, 'Wafello'],
    [/\bYOYIC\b/gi, 'YoyiC'],
    [/\bZEE UP&GO SWIZZ CHOCOLATE 200M\b/gi, 'Zee Up & Go Swiss Chocolate 200ml'],
    [/\bSWIZZ\b/gi, 'Swiss']
  ];

  for (const [re, rep] of replacements) {
    n = n.replace(re, rep);
  }

  // Capitalize neatly
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

function detectCategory(name) {
  const l = name.toLowerCase();
  if (l.includes('kecap') || l.includes('sambal') || l.includes('santan') || l.includes('garam') || l.includes('bumbu') || l.includes('racik') || l.includes('masako') || l.includes('royco') || l.includes('sajiku') || l.includes('sasa') || l.includes('saori') || l.includes('mayumi') || l.includes('mayonai') || l.includes('terasi') || l.includes('gula') || l.includes('tepung') || l.includes('margarin') || l.includes('blue band') || l.includes('minyak') || l.includes('ajinomoto') || l.includes('desaku')) {
    return 'sembako';
  }
  if (l.includes('mie') || l.includes('mi ') || l.includes('indomie') || l.includes('sedaap') || l.includes('sarimi') || l.includes('pop mie') || l.includes('ramen') || l.includes('bihun') || l.includes('sarden') || l.includes('kornet') || l.includes('bubur') || l.includes('pasta') || l.includes('spageti')) {
    return 'makanan';
  }
  if (l.includes('uht') || l.includes('susu') || l.includes('milk') || l.includes('tea') || l.includes('teh') || l.includes('kopi') || l.includes('coffee') || l.includes('caffino') || l.includes('aqua') || l.includes('ades') || l.includes('cleo') || l.includes('mineral') || l.includes('le minerale') || l.includes('pocari') || l.includes('fanta') || l.includes('coca cola') || l.includes('sprite') || l.includes('yakult') || l.includes('floridina') || l.includes('nutrisari') || l.includes('pop ice') || l.includes('larutan') || l.includes('lasegar') || l.includes('cimory') || l.includes('ultra') || l.includes('dancow') || l.includes('milo') || l.includes('hydro coco') || l.includes('good day') || l.includes('torabika') || l.includes('nescafe') || l.includes('pucuk') || l.includes('buavita') || l.includes('you c') || l.includes('air panas')) {
    return 'minuman';
  }
  if (l.includes('wafer') || l.includes('biskuit') || l.includes('biscuit') || l.includes('cookies') || l.includes('snack') || l.includes('oreo') || l.includes('tango') || l.includes('roma') || l.includes('gery') || l.includes('chocolatos') || l.includes('nabati') || l.includes('nextar') || l.includes('better') || l.includes('beng beng') || l.includes('astor') || l.includes('chiki') || l.includes('chitato') || l.includes('lays') || l.includes('piattos') || l.includes('qtela') || l.includes('potabee') || l.includes('japota') || l.includes('kusuka') || l.includes('permen') || l.includes('candy') || l.includes('yupi') || l.includes('mentos') || l.includes('kiss') || l.includes('foxs') || l.includes('blaster') || l.includes('aice') || l.includes('es krim') || l.includes('ice cream') || l.includes('cokelat') || l.includes('chocolate') || l.includes('delfi') || l.includes('cadbury') || l.includes('silverqueen') || l.includes('popcorn') || l.includes('kacang') || l.includes('kuaci') || l.includes('kerupuk') || l.includes('krupuk') || l.includes('makaroni') || l.includes('boncabe') || l.includes('bon cabe') || l.includes('nutrijell') || l.includes('nutrijel') || l.includes('agar') || l.includes('jelly') || l.includes('puding') || l.includes('pudding') || l.includes('nata de coco')) {
    return 'snack';
  }
  if (l.includes('roti') || l.includes('bread') || l.includes('cake') || l.includes('sosis') || l.includes('bakso') || l.includes('nugget') || l.includes('salad') || l.includes('bluder') || l.includes('croissant') || l.includes('pia') || l.includes('mooncake')) {
    return 'segar';
  }
  if (l.includes('sabun') || l.includes('soap') || l.includes('shampoo') || l.includes('shampo') || l.includes('shm') || l.includes('shp') || l.includes('pantene') || l.includes('sunsilk') || l.includes('lifebuoy') || l.includes('clear') || l.includes('lux') || l.includes('giv') || l.includes('dettol') || l.includes('nuvo') || l.includes('shinzui') || l.includes('pepsodent') || l.includes('ciptadent') || l.includes('close up') || l.includes('formula') || l.includes('sikat gigi') || l.includes('pasta gigi') || l.includes('odol') || l.includes('baby') || l.includes('cussons') || l.includes('zwitsal') || l.includes('mitu') || l.includes('kodomo') || l.includes('softex') || l.includes('charm') || l.includes('laurier') || l.includes('protex') || l.includes('sweety') || l.includes('mamypoko') || l.includes('pants') || l.includes('popok') || l.includes('cotton bud') || l.includes('kapas') || l.includes('marina') || l.includes('citra') || l.includes('viva') || l.includes('garnier') || l.includes('fair') || l.includes('glow') || l.includes('rexona') || l.includes('nivea') || l.includes('deodorant') || l.includes('deo') || l.includes('gillette') || l.includes('cukuran')) {
    return 'tubuh';
  }
  if (l.includes('so klin') || l.includes('soklin') || l.includes('rinso') || l.includes('daia') || l.includes('attack') || l.includes('boom') || l.includes('molto') || l.includes('downy') || l.includes('rapika') || l.includes('kispray') || l.includes('super pell') || l.includes('superpel') || l.includes('wipol') || l.includes('vixal') || l.includes('wpc') || l.includes('sunlight') || l.includes('mama lemon') || l.includes('mama lime') || l.includes('ekonomi') || l.includes('cling') || l.includes('bayclin') || l.includes('vanish') || l.includes('baygon') || l.includes('hit') || l.includes('vape') || l.includes('nomos') || l.includes('kapur barus') || l.includes('swallow') || l.includes('bagus') || l.includes('tisu') || l.includes('tissue') || l.includes('nice') || l.includes('paseo') || l.includes('jolly') || l.includes('tessa') || l.includes('multi') || l.includes('montiss') || l.includes('spons') || l.includes('sabut') || l.includes('kit') || l.includes('carrera')) {
    return 'rumah';
  }
  return 'atk';
}

function detectShelf(name, cat) {
  const l = name.toLowerCase();
  if (l.includes('aice') || l.includes('es krim') || l.includes('ice cream') || l.includes('es wawan')) return 'Freezer Es Krim A-01';
  if (l.includes('nugget') || l.includes('sosis') || l.includes('bakso') || l.includes('yakult') || l.includes('cimory yog') || l.includes('kin yog')) return 'Chiller Pendingin C-01';
  if (cat === 'minuman') return 'Chiller & Rak Minuman B-01';
  if (cat === 'snack') return 'Lorong Snack & Biskuit D-01';
  if (cat === 'makanan') return 'Lorong Mi & Makanan Instan E-01';
  if (cat === 'sembako') return 'Lorong Sembako & Bumbu F-01';
  if (cat === 'segar') return 'Etalase Roti & Segar G-01';
  if (cat === 'tubuh') return 'Lorong Perawatan Tubuh H-01';
  if (cat === 'rumah') return 'Lorong Deterjen & Kebersihan J-01';
  if (l.includes('buku') || l.includes('pulpen') || l.includes('pen') || l.includes('pensil') || l.includes('faber') || l.includes('kiky') || l.includes('amplop') || l.includes('kertas')) return 'Display ATK Depan K-01';
  if (l.includes('paramex') || l.includes('bodrex') || l.includes('tolak angin') || l.includes('antangin') || l.includes('komix') || l.includes('mixagrip') || l.includes('balsem') || l.includes('kayu putih') || l.includes('hansaplast')) return 'Etalase Obat & Kasir L-01';
  return 'Display Kasir Depan M-01';
}

const products = [];
let idCounter = 1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith(',,,,') || line.startsWith('Kode Barang')) continue;
  
  // Handle CSV split with possible quotes
  const parts = [];
  let cur = '';
  let inQuotes = false;
  for (let c = 0; c < line.length; c++) {
    const ch = line[c];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur.trim());

  if (parts.length < 5) continue;
  const barcode = parts[0];
  const rawName = parts[1];
  const stock = parseInt(parts[3], 10) || 0;
  const costPrice = parseFloat(parts[4]) || 0;

  const cleanedName = cleanName(rawName);
  const cat = detectCategory(cleanedName);
  const shelf = detectShelf(cleanedName, cat);

  // Margin calculation: retail price usually costPrice * 1.15 to 1.3 rounded up to nearest 500 or 100
  let sellingPrice = Math.round(costPrice * 1.22);
  if (sellingPrice < costPrice) sellingPrice = Math.round(costPrice * 1.15);
  // Round to nearest 500 or 100
  if (sellingPrice > 1000) {
    sellingPrice = Math.ceil(sellingPrice / 500) * 500;
  } else if (sellingPrice > 0) {
    sellingPrice = Math.ceil(sellingPrice / 100) * 100;
  }
  if (costPrice === 0) sellingPrice = 5000;

  const p = {
    id: `prod_ulil_${String(idCounter++).padStart(4, '0')}`,
    barcode: barcode,
    name: cleanedName,
    categoryId: cat,
    categoryName: categoryMap[cat],
    price: sellingPrice,
    costPrice: Math.round(costPrice),
    stock: stock,
    minStock: Math.max(2, Math.floor(stock * 0.3)),
    unit: cleanedName.toLowerCase().includes('renceng') || cleanedName.toLowerCase().includes('pack') ? 'pack' : (cleanedName.toLowerCase().includes('tablet') ? 'strip' : 'pcs'),
    aisleLocation: shelf,
    supplier: 'Distributor Ulilmart Ritel',
    taxApplicable: false,
    rating: 4.8,
    soldCount: Math.floor(Math.random() * 50) + 5
  };

  products.push(p);
}

fs.writeFileSync('cleaned_products.json', JSON.stringify(products, null, 2));
console.log(`Successfully parsed & cleaned ${products.length} products!`);
