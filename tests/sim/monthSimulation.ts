/**
 * Simulasi operasional 1 bulan (Oktober 2026) dengan data dummy deterministik.
 * Memakai logika ASLI aplikasi (src/domain/*, src/utils/cogs) dan meniru perilaku POSContext:
 * penjualan (4 metode bayar, satuan grosir, member, poin, voucher), void, retur penjualan (tunai /
 * transfer / saldo toko, kembali ke stok / rusak), pembelian (tunai / tempo / konsinyasi),
 * pembayaran hutang, retur ke supplier, perubahan harga, pengeluaran, shift (dengan selisih kas),
 * dan stock opname akhir bulan.
 * Menghasilkan juga "pembukuan bayangan" (dihitung terpisah) untuk tutup buku & rekonsiliasi,
 * serta daftar operasi API untuk diputar ulang ke server sungguhan.
 */
import { computeCartTotals, tierPointsMultiplier } from '../../src/domain/cartTotals.ts';
import { saleStockDeltas, applyStockDeltas, linesToDeltas, voidRestockLines } from '../../src/domain/stockMovements.ts';
import { newShift, applySaleToShift, applyCashOut, closeShift, expectedCashOf } from '../../src/domain/shiftCash.ts';
import { lineCogs, returnedCogs } from '../../src/utils/cogs.ts';
import { weightedAverageCost } from '../../src/domain/costing.ts';

// ---------- RNG deterministik ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ServerOp { path: string; body: any }

export function runMonthSimulation(seed = 20261001) {
  const rnd = mulberry32(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
  const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const iso = (day: number, h: number, m = 0) => new Date(Date.UTC(2026, 9, day, h - 7, m)).toISOString(); // jam WIB
  const ymd = (day: number) => `2026-10-${String(day).padStart(2, '0')}`;

  // ---------- Katalog (stok awal 0; diisi lewat faktur pembelian 1 Oktober) ----------
  const P = (id: string, name: string, cat: string, cost: number, price: number, extra: any = {}) =>
    ({ id, name, sku: id.toUpperCase(), barcode: `2000000${String(Math.abs(hash(id)) % 1000000).padStart(6, '0')}`, categoryId: cat, price, costPrice: cost, stock: 0, minStock: 5, unit: 'pcs', ...extra });
  function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
  const products: any[] = [
    P('indomie', 'Indomie Goreng 85g', 'groceries', 2750, 3500, { wholesaleUnits: [{ id: 'dus', name: 'Dus', multiplier: 40, price: 128000, costPrice: 108000 }] }),
    P('aqua', 'Aqua 600ml', 'beverages', 2800, 3500, { wholesaleUnits: [{ id: 'dus', name: 'Dus', multiplier: 24, price: 78000, costPrice: 64800 }] }),
    P('beras5', 'Beras Premium 5kg', 'groceries', 68000, 76000),
    P('gula1', 'Gula Pasir 1kg', 'groceries', 16500, 18500),
    P('minyak2', 'Minyak Goreng 2L', 'groceries', 34000, 38000),
    P('telur', 'Telur Ayam 1kg', 'fresh', 26000, 29500),
    P('kopi', 'Kopi Sachet 20g', 'beverages', 1100, 1500),
    P('teh', 'Teh Celup isi 25', 'beverages', 5800, 7000),
    P('susu', 'Susu UHT 200ml', 'beverages', 4600, 5500),
    P('rokok', 'Rokok Filter 16', 'tobacco', 30500, 33000, { wholesaleUnits: [{ id: 'slop', name: 'Slop', multiplier: 10, price: 325000, costPrice: 302000 }] }),
    P('sabun', 'Sabun Mandi 85g', 'personal_care', 3300, 4000),
    P('sampo', 'Sampo Sachet 10ml', 'personal_care', 900, 1000),
    P('odol', 'Pasta Gigi 190g', 'personal_care', 11500, 13500),
    P('deterjen', 'Deterjen 800g', 'home_care', 17000, 19500),
    P('tisu', 'Tisu 250 lembar', 'home_care', 9500, 11500),
    P('keripik', 'Keripik Kentang 68g', 'snacks', 8200, 10000),
    P('biskuit', 'Biskuit Kelapa 300g', 'snacks', 9800, 12000),
    P('permen', 'Permen Mint', 'snacks', 400, 500),
    P('roti', 'Roti Titipan (konsinyasi)', 'fresh', 4000, 5000),
  ];
  const byId = new Map(products.map((p) => [p.id, p]));
  const customers: any[] = [
    { id: 'm1', name: 'Bu Sri', phone: '0812000001', tier: 'Gold', points: 120, totalSpent: 0, ordersCount: 0 },
    { id: 'm2', name: 'Pak Joko', phone: '0812000002', tier: 'Silver', points: 40, totalSpent: 0, ordersCount: 0 },
    { id: 'm3', name: 'Mbak Rina', phone: '0812000003', tier: 'Bronze', points: 0, totalSpent: 0, ordersCount: 0 },
    { id: 'm4', name: 'Warung Bu Tini', phone: '0812000004', tier: 'Platinum', points: 300, totalSpent: 0, ordersCount: 0 },
  ];
  const openingPoints = customers.reduce((s, c) => s + c.points, 0);
  const vouchers: any[] = [
    { code: 'HEMAT10', discountType: 'percentage', value: 10, minSpend: 50000, maxDiscount: 5000, description: 'Diskon 10%' },
    { code: 'POTONG2RB', discountType: 'fixed', value: 2000, minSpend: 25000, description: 'Potong Rp 2.000' },
  ];
  const settings = { pointsRatio: 10000, pointRedemptionRate: 100 };
  const INITIAL_CAPITAL = 30_000_000; // dirinci: Rp 25 jt di laci, Rp 5 jt di bank
  const INITIAL_CASH = 25_000_000, INITIAL_BANK = 5_000_000;

  const transactions: any[] = [];
  const salesReturns: any[] = [];
  const purchases: any[] = [];
  const purchaseReturns: any[] = [];
  const expenses: any[] = [];
  const shifts: any[] = [];
  const priceChanges: any[] = [];
  const opname: any[] = [];
  const serverOps: ServerOp[] = [{ path: '/api/lan/data/sync-products', body: { products: products.map((p) => ({ ...p })) } }];
  const daily: any[] = [];
  const log: string[] = [];
  let txSeq = 0, retSeq = 0, poSeq = 0;
  const cashiers = [{ id: 'k1', name: 'Siti (Kasir)', role: 'cashier' }, { id: 'k2', name: 'Dewi (Kasir)', role: 'cashier' }];

  // Bayangan (dihitung terpisah dari fungsi laporan aplikasi)
  const shadow = { cashDrawer: INITIAL_CASH, bank: INITIAL_BANK, edc: 0, payable: 0, consignmentPayable: 0, storeCredit: 0, supplierReceivable: 0, opnameLossValue: 0, supplierReturnValue: 0, pointsEarned: 0, pointsUsed: 0, revaluationRounding: 0, returnRevaluation: 0 };

  const setStock = (deltas: { productId: string; delta: number }[]) => {
    const updated = applyStockDeltas(products, deltas);
    updated.forEach((p, i) => (products[i] = p));
    products.forEach((p) => byId.set(p.id, p));
  };

  // ---------- Pembelian ----------
  function receive(day: number, supplierName: string, terms: string, items: Array<[string, number, number?]>) {
    const lines = items.map(([pid, qty, cost]) => {
      const p = byId.get(pid)!;
      const c = cost ?? p.costPrice;
      return { productId: pid, productName: p.name, quantity: qty, costPrice: c, subtotal: qty * c };
    });
    const total = lines.reduce((s, l) => s + l.subtotal, 0);
    const po = { id: `po-${++poSeq}`, invoiceNumber: `FKT-${String(poSeq).padStart(3, '0')}`, supplierName, paymentTerms: terms, items: lines, totalAmount: total, finalTotal: total, createdAt: iso(day, 8), receivedBy: 'Owner', payments: [] as any[] };
    purchases.push(po);
    // seperti processSupplierPurchase: stok bertambah, harga modal = harga beli terbaru
    for (const l of lines) {
      const p = byId.get(l.productId)!;
      // seperti aplikasi: harga modal rata-rata tertimbang
      const newCost = weightedAverageCost(p.stock, p.costPrice, l.quantity, l.costPrice);
      shadow.revaluationRounding += (p.stock + l.quantity) * newCost - (p.stock * p.costPrice + l.quantity * l.costPrice);
      if (newCost !== p.costPrice) priceChanges.push({ date: ymd(day), productId: p.id, field: 'harga modal (rata-rata)', from: p.costPrice, to: newCost });
      const np = { ...p, stock: p.stock + l.quantity, costPrice: newCost };
      products[products.findIndex((x) => x.id === p.id)] = np; byId.set(p.id, np);
    }
    serverOps.push({ path: '/api/lan/data/stock-adjust', body: { key: `adj-${po.id}`, items: lines.map((l) => ({ productId: l.productId, delta: l.quantity })), reason: `Terima ${po.invoiceNumber}` } });
    const kind = /konsinyasi|titip/i.test(terms) ? 'consignment' : /tempo|kredit|hari/i.test(terms) ? 'credit' : 'cash';
    if (kind === 'cash') shadow.cashDrawer -= total; else if (kind === 'credit') shadow.payable += total; else shadow.consignmentPayable += total;
    log.push(`${ymd(day)} Terima ${po.invoiceNumber} ${supplierName} (${terms}) Rp ${total}`);
    return po;
  }
  function paySupplier(day: number, po: any, amount: number, source: 'cash_drawer' | 'bank_transfer') {
    po.payments.push({ id: `pay-${po.id}-${po.payments.length + 1}`, amount, date: iso(day, 9), source, recordedBy: 'Owner' });
    if (/konsinyasi|titip/i.test(po.paymentTerms)) shadow.consignmentPayable -= amount; else shadow.payable -= amount;
    if (source === 'bank_transfer') shadow.bank -= amount; else shadow.cashDrawer -= amount;
    log.push(`${ymd(day)} Bayar ${po.invoiceNumber} Rp ${amount} (${source})`);
  }

  // Stok awal lewat faktur (tunai) - semua persediaan tercatat
  receive(1, 'Grosir Sumber Rejeki', 'Tunai / Cash', [
    ['indomie', 400], ['aqua', 240], ['beras5', 30], ['gula1', 60], ['minyak2', 40], ['telur', 40], ['kopi', 300], ['teh', 50],
    ['susu', 120], ['rokok', 80], ['sabun', 100], ['sampo', 300], ['odol', 40], ['deterjen', 40], ['tisu', 40], ['keripik', 60], ['biskuit', 50], ['permen', 500],
  ]);
  const rotiPO = receive(1, 'Toko Roti Pak Harun', 'Konsinyasi / Titip Jual', [['roti', 60]]);

  // ---------- Hari demi hari ----------
  for (let day = 1; day <= 31; day++) {
    const dow = new Date(Date.UTC(2026, 9, day)).getUTCDay();
    const cashier = cashiers[day % 2]!;
    let shift: any = newShift(cashier as any, 300000, new Date(iso(day, 7)));
    const dayStart = { sales: 0, tx: 0, returns: 0, voids: 0 };
    const nTx = (dow === 0 || dow === 6 ? between(26, 34) : between(16, 24)) + (day >= 25 && day <= 27 ? 10 : 0);

    // Perubahan harga jual (gula naik 15 Okt)
    if (day === 15) {
      const g = byId.get('gula1')!; priceChanges.push({ date: ymd(day), productId: 'gula1', field: 'harga jual', from: g.price, to: 19500 });
      const ng = { ...g, price: 19500 }; products[products.findIndex((x) => x.id === 'gula1')] = ng; byId.set('gula1', ng);
    }

    for (let t = 0; t < nTx; t++) {
      const hour = between(7, 20), minute = between(0, 59);
      const cart: any[] = [];
      const lines = between(1, 5);
      for (let k = 0; k < lines; k++) {
        const p = pick(products.filter((x) => x.stock > 0));
        if (!p) break;
        const unit = p.wholesaleUnits && rnd() < 0.12 ? p.wholesaleUnits[0] : undefined;
        const mult = unit?.multiplier ?? 1;
        const qty = unit ? 1 : between(1, p.price < 2000 ? 6 : 3);
        const already = cart.filter((c) => c.product.id === p.id).reduce((s, c) => s + c.quantity * (c.selectedUnit?.multiplier ?? 1), 0);
        if (p.stock - already < qty * mult) continue;
        const unitPrice = unit ? unit.price : p.price;
        const margin = (unitPrice - (unit?.costPrice ?? p.costPrice * mult)) / unitPrice;
        cart.push({ id: `${p.id}-${k}`, product: { ...p }, quantity: qty, selectedUnit: unit, selectedOptions: [], unitPrice, totalPrice: unitPrice * qty, isPointsEligible: margin >= 0.15 });
      }
      if (cart.length === 0) continue;
      const customer = rnd() < 0.25 ? pick(customers) : null;
      const voucher = rnd() < 0.1 ? pick(vouchers) : null;
      const wantPoints = customer && customer.points >= 50 && rnd() < 0.3 ? Math.min(customer.points, 100) : 0;
      const totals = computeCartTotals({ cart, voucher, customer, pointsToRedeem: wantPoints, pointRedemptionRate: settings.pointRedemptionRate, pointsRatio: settings.pointsRatio });
      const method = ((r) => (r < 0.6 ? 'cash' : r < 0.85 ? 'qris' : r < 0.93 ? 'card' : 'transfer'))(rnd());
      const tendered = method === 'cash' ? Math.ceil(totals.finalTotal / 5000) * 5000 : totals.finalTotal;
      const tx: any = {
        id: `tx-${++txSeq}`, invoiceNumber: `INV-202610${String(day).padStart(2, '0')}-${String(txSeq).padStart(4, '0')}`, orderType: 'takeaway',
        customer: customer ? { ...customer } : undefined, items: cart, subtotal: totals.subtotal, taxAmount: 0, serviceChargeAmount: 0,
        discountAmount: totals.totalDiscount, voucherCode: voucher && totals.voucherDiscount > 0 ? voucher.code : undefined,
        pointsUsed: totals.effectivePointsToRedeem, pointsDiscount: totals.pointsDiscount, pointsEarned: customer ? totals.pointsEarned : 0,
        finalTotal: totals.finalTotal, payment: { method, amountTendered: tendered, change: tendered - totals.finalTotal },
        cashierName: cashier.name, branchName: 'Uji', createdAt: iso(day, hour, minute), status: 'completed',
      };
      transactions.push(tx);
      setStock(saleStockDeltas(cart));
      shift = applySaleToShift(shift, tx.finalTotal, method === 'cash');
      if (customer) {
        customer.points = customer.points - tx.pointsUsed + tx.pointsEarned;
        customer.totalSpent += tx.finalTotal; customer.ordersCount++;
        shadow.pointsEarned += tx.pointsEarned; shadow.pointsUsed += tx.pointsUsed;
      }
      if (method === 'cash') shadow.cashDrawer += tx.finalTotal; else if (method === 'card') shadow.edc += tx.finalTotal; else shadow.bank += tx.finalTotal;
      serverOps.push({ path: '/api/lan/data/push-transaction', body: { transaction: structuredClone(tx), clientId: 'sim', clientName: 'Simulasi' } }); // salinan, seperti antrean kirim
      dayStart.sales += tx.finalTotal; dayStart.tx++;

      // Void (~1%): langsung dibatalkan, stok kembali, uang dikembalikan
      if (rnd() < 0.012 && !customer) {
        tx.status = 'void';
        setStock(linesToDeltas(voidRestockLines(tx)));
        serverOps.push({ path: '/api/lan/data/stock-return', body: { key: `void-${tx.id}`, kind: 'void', items: voidRestockLines(tx), transactionId: tx.id, transactionUpdate: { status: 'void' } } });
        if (method === 'cash') { shift = applyCashOut(shift, tx.finalTotal); shadow.cashDrawer -= tx.finalTotal; }
        else if (method === 'card') shadow.edc -= tx.finalTotal; else shadow.bank -= tx.finalTotal;
        dayStart.voids++;
      }
    }

    // Retur penjualan (~2-3 per minggu): tunai / transfer / saldo toko; kembali ke stok atau rusak
    if (rnd() < 0.4) {
      const candidates = transactions.filter((x) => x.status === 'completed' && x.createdAt < iso(day, 7) && !x.returnedAmount);
      const src: any = candidates.length ? pick(candidates) : null;
      if (src) {
        const line: any = pick(src.items as any[]);
        const mult = line.selectedUnit?.multiplier ?? 1;
        const share = src.subtotal > 0 ? src.finalTotal / src.subtotal : 1; // refund mengikuti harga setelah diskon
        const refund = Math.round(line.unitPrice * share);
        const method = (['cash', 'transfer', 'store_credit', 'cash'] as const)[retSeq % 4]; // bergiliran: semua jalur teruji
        const restock = (retSeq + 1) % 4 !== 0 && rnd() < 0.9; // setiap retur ke-4: barang rusak (tidak kembali ke stok)
        const r: any = {
          id: `ret-${++retSeq}`, returnNumber: `RTR-${String(retSeq).padStart(3, '0')}`, transactionId: src.id, invoiceNumber: src.invoiceNumber, customerName: src.customer?.name,
          items: [{ productId: line.product.id, productName: line.product.name, quantity: 1, unitPrice: refund, totalRefund: refund, reason: restock ? 'Salah beli' : 'Rusak', restockToInventory: restock, unitMultiplier: mult }],
          totalRefundAmount: refund, refundMethod: method, cashierName: cashier.name, createdAt: iso(day, 12),
        };
        salesReturns.push(r);
        src.returnedAmount = refund;
        if (restock) {
          // Barang masuk lagi dinilai modal TERKINI, HPP dibalik memakai modal SAAT DIJUAL
          shadow.returnRevaluation += mult * (byId.get(line.product.id)!.costPrice - line.product.costPrice);
          setStock([{ productId: line.product.id, delta: mult }]);
          serverOps.push({ path: '/api/lan/data/stock-return', body: { key: `ret-${r.id}`, kind: 'return', items: [{ productId: line.product.id, quantity: 1, unitMultiplier: mult }], transactionId: src.id } });
        }
        if (method === 'cash') { shift = applyCashOut(shift, refund); shadow.cashDrawer -= refund; }
        else if (method === 'transfer') shadow.bank -= refund; else shadow.storeCredit += refund;
        dayStart.returns++;
      }
    }

    // Pembelian rutin: tempo tiap Senin, tunai saat stok menipis, roti konsinyasi tiap 3 hari
    if (dow === 1) {
      const low = products.filter((p) => p.id !== 'roti' && p.stock < 40);
      if (low.length) {
        const cost = (p: any) => (day >= 12 && p.id === 'gula1' ? 17200 : day >= 12 && p.id === 'minyak2' ? 35000 : p.costPrice);
        receive(day, 'Distributor Maju Jaya', 'Tempo 14 Hari', low.map((p) => [p.id, Math.max(40, p.id === 'permen' ? 300 : 60), cost(p)] as [string, number, number]));
      }
    }
    if (day % 3 === 1 && day > 1) receive(day, 'Toko Roti Pak Harun', 'Konsinyasi / Titip Jual', [['roti', 30]]);
    // Bayar hutang tempo yang jatuh tempo (sebagian / lunas)
    for (const po of purchases) {
      if (!/tempo/i.test(po.paymentTerms)) continue;
      const due = new Date(po.createdAt).getTime() + 14 * 86400000;
      const paid = po.payments.reduce((s: number, x: any) => s + x.amount, 0);
      const out = po.finalTotal - paid;
      if (out > 0 && new Date(iso(day, 9)).getTime() >= due) paySupplier(day, po, day < 31 && out > 3_000_000 ? Math.round(out / 2) : out, 'bank_transfer');
    }
    // Konsinyasi roti: setor ke pemilik tiap Sabtu sebesar roti terjual (harga modal)
    if (dow === 6) {
      const sold = transactions.filter((x) => x.status === 'completed' && x.createdAt <= iso(day, 23)).flatMap((x: any) => x.items).filter((l: any) => l.product.id === 'roti').reduce((s: number, l: any) => s + l.quantity, 0);
      const paidSoFar = purchases.filter((p) => p.supplierName === 'Toko Roti Pak Harun').flatMap((p) => p.payments).reduce((s: number, x: any) => s + x.amount, 0);
      let toPay = sold * 4000 - paidSoFar;
      for (const po of purchases.filter((p) => p.supplierName === 'Toko Roti Pak Harun')) {
        const out = po.finalTotal - po.payments.reduce((s: number, x: any) => s + x.amount, 0);
        const amt = Math.min(out, toPay);
        if (amt > 0) { paySupplier(day, po, amt, 'cash_drawer'); shift = applyCashOut(shift, amt); toPay -= amt; }
      }
    }
    // Retur ke supplier (sekali): susu rusak/kedaluwarsa
    if (day === 18) {
      const p = byId.get('susu')!; const qty = Math.min(6, p.stock);
      purchaseReturns.push({ id: 'pr-1', returnNumber: 'RET-SUP-001', supplierName: 'Grosir Sumber Rejeki', reason: 'Kedaluwarsa / Near Expired (FEFO)', items: [{ productId: 'susu', productName: p.name, quantity: qty, costPrice: p.costPrice, totalAmount: qty * p.costPrice }], totalAmount: qty * p.costPrice, status: 'completed', createdAt: iso(day, 10), processedBy: 'Owner' });
      setStock([{ productId: 'susu', delta: -qty }]);
      serverOps.push({ path: '/api/lan/data/stock-adjust', body: { key: 'adj-pr-1', items: [{ productId: 'susu', delta: -qty }], reason: 'Retur supplier RET-SUP-001' } });
      shadow.supplierReturnValue += qty * p.costPrice;
      // Pembelian ke supplier ini tunai (tanpa hutang): nilai retur menjadi piutang retur supplier
      shadow.supplierReceivable += qty * p.costPrice;
      log.push(`${ymd(day)} Retur ke supplier ${qty} susu (Rp ${qty * p.costPrice}) -> piutang retur supplier`);
    }
    // Pengeluaran
    const addExp = (category: string, description: string, amount: number, source: 'cash_drawer' | 'bank_transfer') => {
      expenses.push({ id: `exp-${expenses.length + 1}`, date: ymd(day), category, description, amount, paymentSource: source, recordedBy: 'Owner' });
      if (source === 'cash_drawer') { shift = applyCashOut(shift, amount); shadow.cashDrawer -= amount; } else shadow.bank -= amount;
    };
    if (day % 7 === 3) addExp('perlengkapan_kantor', 'Kantong plastik & struk', 45000, 'cash_drawer');
    if (day === 5) addExp('listrik_air_internet', 'Listrik & internet', 650000, 'bank_transfer');
    if (day === 28) addExp('gaji_karyawan', 'Gaji 2 kasir', 3600000, 'bank_transfer');
    if (day === 1) addExp('sewa_ruko', 'Sewa ruko Oktober', 1500000, 'bank_transfer');
    if (day === 20) addExp('pemeliharaan_toko', 'Servis AC & lampu', 250000, 'cash_drawer');
    if (day % 7 === 0) addExp('konsumsi_operasional', 'Air minum & kopi karyawan', 30000, 'cash_drawer');
    if (day % 10 === 0) addExp('lainnya', 'Bensin belanja ke grosir', 50000, 'cash_drawer');

    // Tutup shift: uang dihitung; sesekali selisih
    const diff = rnd() < 0.15 ? pick([-5000, -2000, 1000, -1000]) : 0;
    const counted = expectedCashOf(shift) + diff;
    const closed = closeShift(shift, counted, diff ? 'Selisih saat hitung' : '', new Date(iso(day, 21, 30)));
    shifts.push(closed);
    shadow.cashDrawer += diff; // kas fisik mengikuti hitungan
    daily.push({ date: ymd(day), transaksi: dayStart.tx, penjualan: dayStart.sales, void: dayStart.voids, retur: dayStart.returns, kasDiharapkan: expectedCashOf(shift), kasDihitung: counted, selisih: diff });
  }

  // ---------- Stock opname 31 Oktober: beberapa barang hilang/rusak ----------
  for (const [pid, delta] of [['permen', -12], ['sampo', -5], ['keripik', -2], ['kopi', 3]] as Array<[string, number]>) {
    const p = byId.get(pid)!; const d = Math.max(-p.stock, delta);
    opname.push({ productId: pid, name: p.name, before: p.stock, after: p.stock + d, delta: d, value: d * p.costPrice });
    setStock([{ productId: pid, delta: d }]);
    shadow.opnameLossValue += d * p.costPrice;
  }
  serverOps.push({ path: '/api/lan/data/stock-adjust', body: { key: 'adj-opname-okt', items: opname.map((o) => ({ productId: o.productId, delta: o.delta })), reason: 'Stock opname Oktober' } });

  return { products, customers, vouchers, transactions, salesReturns, purchases, purchaseReturns, expenses, shifts, opname, priceChanges, daily, log, serverOps, shadow, openingPoints, INITIAL_CAPITAL, INITIAL_CASH, INITIAL_BANK, settings };
}

/** Pembukuan bayangan: laba rugi dihitung langsung dari data mentah, terpisah dari accountingLedger. */
export function shadowIncome(sim: ReturnType<typeof runMonthSimulation>) {
  const sold = sim.transactions.filter((t) => t.status !== 'void');
  const gross = sold.reduce((s, t) => s + t.subtotal, 0);
  const discounts = sold.reduce((s, t) => s + t.discountAmount - Math.min(t.discountAmount, t.pointsDiscount || 0), 0);
  const pointsExpense = sold.reduce((s, t) => s + (t.pointsEarned || 0) * sim.settings.pointRedemptionRate, 0);
  const returns = sim.salesReturns.reduce((s, r) => s + r.totalRefundAmount, 0);
  const txById = new Map(sim.transactions.map((t) => [t.id, t]));
  const cogs = sold.flatMap((t) => t.items).reduce((s, l) => s + lineCogs(l), 0) - sim.salesReturns.reduce((s, r) => s + returnedCogs(r, txById as any), 0);
  const expenses = sim.expenses.reduce((s, e) => s + e.amount, 0) + pointsExpense;
  const shortage = sim.shifts.reduce((s, sh) => s + Math.max(0, -(sh.difference || 0)), 0);
  const overage = sim.shifts.reduce((s, sh) => s + Math.max(0, sh.difference || 0), 0);
  const netSales = gross - discounts - returns;
  return { gross, discounts, returns, netSales, cogs: Math.round(cogs), grossProfit: netSales - Math.round(cogs), expenses, pointsExpense, shortage, overage, net: netSales - Math.round(cogs) - expenses - shortage + overage };
}
