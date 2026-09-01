// Category mapping helper
export function mapCategory(catName: string): string {
  const c = (catName || '').toLowerCase();
  if (c === 'cat-staple' || c === 'groceries' || c.includes('sembako') || c.includes('bumbu') || c.includes('bahan pokok') || c.includes('beras') || c.includes('minyak') || c.includes('gula') || c.includes('tepung') || c.includes('telur') || c.includes('kecap') || c.includes('saus') || c.includes('garam') || c.includes('sambal')) return 'groceries';
  if (c === 'cat-bev' || c === 'beverages' || c.includes('minuman') || c.includes('susu') || c.includes('kopi') || c.includes('teh') || c.includes('jus') || c.includes('air') || c.includes('soda') || c.includes('uht')) return 'beverages';
  if (c === 'cat-snk' || c === 'snacks' || c.includes('snack') || c.includes('biskuit') || c.includes('wafer') || c.includes('keripik') || c.includes('cokelat') || c.includes('permen') || c.includes('kacang')) return 'snacks';
  if (c === 'cat-instant' || c === 'instant' || c.includes('mi ') || c.includes('mie') || c.includes('makanan instan') || c.includes('kaleng') || c.includes('sarden') || c.includes('kornet') || c.includes('bubur')) return 'instant';
  if (c === 'cat-fresh' || c === 'fresh' || c.includes('segar') || c.includes('dingin') || c.includes('buah') || c.includes('sayur') || c.includes('keju') || c.includes('mentega') || c.includes('yoghurt')) return 'fresh';
  if (c === 'cat-pers' || c === 'personal_care' || c.includes('perawatan') || c.includes('tubuh') || c.includes('sabun') || c.includes('sampo') || c.includes('shampo') || c.includes('zinc') || c.includes('zink') || c.includes('pasta gigi') || c.includes('skincare') || c.includes('deodorant') || c.includes('parfum') || c.includes('zwitsal') || c.includes('baby') || c.includes('bayi') || c.includes('cussons') || c.includes('popok')) return 'personal_care';
  if (c === 'cat-clean' || c === 'home_care' || c.includes('pembersih') || c.includes('kebersihan') || c.includes('deterjen') || c.includes('rumah') || c.includes('cuci') || c.includes('pewangi') || c.includes('karbol') || c.includes('lantai') || c.includes('nyamuk')) return 'home_care';
  if (c === 'cat-other' || c === 'atk_meds' || c.includes('atk') || c.includes('obat') || c.includes('baterai') || c.includes('medis') || c.includes('toko') || c.includes('kertas')) return 'atk_meds';
  if (c === 'cat-cig' || c === 'tobacco' || c.includes('rokok') || c.includes('tembakau') || c.includes('cerutu') || c.includes('kretek') || c.includes('filter')) return 'tobacco';
  if (c === 'cat-bakery' || c === 'bakery_ready' || c.includes('roti') || c.includes('bakery') || c.includes('siap saji') || c.includes('kue') || c.includes('onigiri') || c.includes('bento')) return 'bakery_ready';
  return 'groceries';
}

export function getImageForCategory(catId: string, name: string): string {
  const n = name.toLowerCase();
  if (n.includes('zwitsal') || n.includes('baby') || n.includes('cussons') || n.includes('my baby')) return 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&auto=format&fit=crop&q=60';
  if (n.includes('kecap')) return 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&auto=format&fit=crop&q=60';
  if (n.includes('sambal') || n.includes('saus')) return 'https://images.unsplash.com/photo-1588615419957-c0e66050b106?w=400&auto=format&fit=crop&q=60';
  if (n.includes('susu') || n.includes('milk') || n.includes('ultra')) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=60';
  if (n.includes('teh') || n.includes('tea') || n.includes('pucuk') || n.includes('sosro')) return 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&auto=format&fit=crop&q=60';
  if (n.includes('kopi') || n.includes('coffee') || n.includes('nescafe') || n.includes('kapal api')) return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=60';
  if (n.includes('mie') || n.includes('indomie') || n.includes('sedaap') || n.includes('sarimi')) return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60';
  if (n.includes('wafer') || n.includes('biskuit') || n.includes('nabati') || n.includes('tango') || n.includes('oreo')) return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=60';
  if (n.includes('cokelat') || n.includes('chocolatos') || n.includes('silverqueen') || n.includes('delfi')) return 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&auto=format&fit=crop&q=60';
  if (n.includes('sabun') || n.includes('dettol') || n.includes('lifebuoy') || n.includes('giv')) return 'https://images.unsplash.com/photo-1607006314644-884c7e6c46a6?w=400&auto=format&fit=crop&q=60';
  if (n.includes('shampo') || n.includes('pantene') || n.includes('clear') || n.includes('sunsilk') || n.includes('zinc') || n.includes('zink')) return 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=60';
  if (n.includes('deterjen') || n.includes('so klin') || n.includes('rinso') || n.includes('daia') || n.includes('molto')) return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60';
  if (n.includes('baterai') || n.includes('pen') || n.includes('buku') || n.includes('faber')) return 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=60';
  if (n.includes('air') || n.includes('aqua') || n.includes('le minerale') || n.includes('cleo')) return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=60';
  if (n.includes('es krim') || n.includes('aice')) return 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=60';

  switch (catId) {
    case 'beverages': return 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&auto=format&fit=crop&q=60';
    case 'snacks': return 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&auto=format&fit=crop&q=60';
    case 'instant': return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60';
    case 'personal_care': return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=60';
    case 'home_care': return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60';
    case 'atk_meds': return 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=400&auto=format&fit=crop&q=60';
    case 'fresh': return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=60';
    default: return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=60';
  }
}
