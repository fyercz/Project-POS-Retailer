// Category mapping helper
export function mapCategory(catName: string): string {
  const c = (catName || '').toLowerCase();
  if (c.includes('sembako') || c.includes('bumbu')) return 'groceries';
  if (c.includes('minuman') || c.includes('susu')) return 'beverages';
  if (c.includes('snack') || c.includes('biskuit')) return 'snacks';
  if (c.includes('mi ') || c.includes('makanan instan') || c.includes('kaleng')) return 'instant';
  if (c.includes('segar') || c.includes('roti')) return 'fresh';
  if (c.includes('perawatan') || c.includes('bayi')) return 'personal_care';
  if (c.includes('pembersih') || c.includes('kebersihan') || c.includes('deterjen')) return 'home_care';
  if (c.includes('atk') || c.includes('obat')) return 'atk_meds';
  if (c.includes('rokok') || c.includes('tembakau')) return 'tobacco';
  return 'groceries';
}

export function getImageForCategory(catId: string, name: string): string {
  const n = name.toLowerCase();
  if (n.includes('kecap')) return 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&auto=format&fit=crop&q=60';
  if (n.includes('sambal') || n.includes('saus')) return 'https://images.unsplash.com/photo-1588615419957-c0e66050b106?w=400&auto=format&fit=crop&q=60';
  if (n.includes('susu') || n.includes('milk') || n.includes('ultra')) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=60';
  if (n.includes('teh') || n.includes('tea') || n.includes('pucuk') || n.includes('sosro')) return 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&auto=format&fit=crop&q=60';
  if (n.includes('kopi') || n.includes('coffee') || n.includes('nescafe')) return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=60';
  if (n.includes('mie') || n.includes('indomie') || n.includes('sedaap') || n.includes('sarimi')) return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60';
  if (n.includes('wafer') || n.includes('biskuit') || n.includes('nabati') || n.includes('tango') || n.includes('oreo')) return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=60';
  if (n.includes('cokelat') || n.includes('chocolatos') || n.includes('silverqueen') || n.includes('delfi')) return 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&auto=format&fit=crop&q=60';
  if (n.includes('sabun') || n.includes('dettol') || n.includes('lifebuoy') || n.includes('giv')) return 'https://images.unsplash.com/photo-1607006314644-884c7e6c46a6?w=400&auto=format&fit=crop&q=60';
  if (n.includes('shampo') || n.includes('pantene') || n.includes('clear') || n.includes('sunsilk')) return 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=60';
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
