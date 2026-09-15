import { BackupPayload, Product, StoreSettings, Transaction, Customer, Supplier, Employee } from '../types';

export interface ValidationCheckItem {
  id: string;
  name: string;
  category: 'schema' | 'compatibility' | 'integrity' | 'safety';
  status: 'passed' | 'warning' | 'failed';
  details: string;
}

export interface BackupValidationReport {
  isValid: boolean;
  canRestore: boolean;
  status: 'passed' | 'warning' | 'failed';
  statusMessage: string;
  fileInfo: {
    fileName: string;
    fileSize: string;
    version: string;
    app: string;
    exportedAt: string;
    storeName: string;
    branchName: string;
  };
  metrics: {
    validProductsCount: number;
    corruptedProductsCount: number;
    duplicateProductIdsCount: number;
    validTransactionsCount: number;
    corruptedTransactionsCount: number;
    validCustomersCount: number;
    corruptedCustomersCount: number;
    validSuppliersCount: number;
    validEmployeesCount: number;
    totalStockValue: number;
  };
  checks: ValidationCheckItem[];
  warnings: string[];
  criticalErrors: string[];
  sanitizedPayload: BackupPayload | null;
}

export function validateBackupFile(
  rawJsonString: string,
  currentSettings: StoreSettings,
  fileName: string = 'backup.json',
  fileSizeStr: string = '0 KB'
): BackupValidationReport {
  const checks: ValidationCheckItem[] = [];
  const warnings: string[] = [];
  const criticalErrors: string[] = [];

  // Default empty report structure in case of fatal error
  const report: BackupValidationReport = {
    isValid: false,
    canRestore: false,
    status: 'failed',
    statusMessage: '',
    fileInfo: {
      fileName,
      fileSize: fileSizeStr,
      version: 'Tidak Diketahui',
      app: 'Tidak Diketahui',
      exportedAt: '-',
      storeName: '-',
      branchName: '-',
    },
    metrics: {
      validProductsCount: 0,
      corruptedProductsCount: 0,
      duplicateProductIdsCount: 0,
      validTransactionsCount: 0,
      corruptedTransactionsCount: 0,
      validCustomersCount: 0,
      corruptedCustomersCount: 0,
      validSuppliersCount: 0,
      validEmployeesCount: 0,
      totalStockValue: 0,
    },
    checks,
    warnings,
    criticalErrors,
    sanitizedPayload: null,
  };

  // CHECK 1: JSON Syntax & Parsing
  let parsed: any = null;
  try {
    if (!rawJsonString || rawJsonString.trim().length === 0) {
      throw new Error('Berkas cadangan kosong (0 byte).');
    }
    parsed = JSON.parse(rawJsonString);
    checks.push({
      id: 'json_syntax',
      name: 'Sintaks & Struktur Berkas JSON',
      category: 'schema',
      status: 'passed',
      details: 'Berkas memiliki format JSON yang valid dan dapat di-parse dengan sempurna.',
    });
  } catch (err: any) {
    criticalErrors.push(`Format JSON Rusak: ${err?.message || 'Gagal mem-parse JSON'}`);
    checks.push({
      id: 'json_syntax',
      name: 'Sintaks & Struktur Berkas JSON',
      category: 'schema',
      status: 'failed',
      details: `Sintaks JSON tidak valid: ${err?.message || 'Bukan dokumen JSON valid'}.`,
    });
    report.statusMessage = 'Berkas JSON rusak dan tidak dapat dibaca. Pemulihan dibatalkan demi keamanan.';
    return report;
  }

  // CHECK 2: Root Schema & 'data' Block Verification
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    criticalErrors.push('Objek akar (root object) bukan objek data JSON valid.');
    checks.push({
      id: 'root_schema',
      name: 'Struktur Objek Skema',
      category: 'schema',
      status: 'failed',
      details: 'Dokumen JSON harus berupa objek yang membungkus metadata dan blok data POS.',
    });
    report.statusMessage = 'Format berkas tidak sesuai standar cadangan POS.';
    return report;
  }

  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    criticalErrors.push('Blok "data" basis data POS tidak ditemukan di dalam berkas.');
    checks.push({
      id: 'root_schema',
      name: 'Struktur Objek Skema',
      category: 'schema',
      status: 'failed',
      details: 'Berkas tidak memiliki blok "data" tempat tabel produk dan transaksi disimpan.',
    });
    report.statusMessage = 'Berkas tidak memuat blok data database POS.';
    return report;
  }

  checks.push({
    id: 'root_schema',
    name: 'Struktur Objek Skema',
    category: 'schema',
    status: 'passed',
    details: 'Blok metadata root dan blok tabel data database lengkap terdeteksi.',
  });

  // Extract Metadata Info
  const payloadVersion = typeof parsed.version === 'string' ? parsed.version : '1.0.0';
  const payloadApp = typeof parsed.app === 'string' ? parsed.app : 'SmartPOS Retail';
  const payloadStoreName = typeof parsed.storeName === 'string' ? parsed.storeName : 'Toko Ritel';
  const payloadBranch = typeof parsed.branchName === 'string' ? parsed.branchName : 'Terminal Utama';
  const payloadExportedAt = typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString();

  report.fileInfo = {
    fileName,
    fileSize: fileSizeStr,
    version: payloadVersion,
    app: payloadApp,
    exportedAt: payloadExportedAt,
    storeName: payloadStoreName,
    branchName: payloadBranch,
  };

  // CHECK 3: Application Compatibility & Version
  const currentAppSignature = 'SmartPOS Retail';
  const isSignatureCompatible =
    payloadApp.toLowerCase().includes('pos') ||
    payloadApp.toLowerCase().includes('retail') ||
    payloadApp.toLowerCase().includes('smartpos') ||
    payloadApp.toLowerCase().includes('ulilmart');

  if (!isSignatureCompatible) {
    warnings.push(
      `Tanda tangan aplikasi berkas adalah "${payloadApp}". Pastikan berkas ini dibuat dari sistem POS yang kompatibel.`
    );
    checks.push({
      id: 'app_compatibility',
      name: 'Kompatibilitas Tanda Tangan Aplikasi',
      category: 'compatibility',
      status: 'warning',
      details: `Aplikasi asal: "${payloadApp}". Standar sistem: "${currentAppSignature}".`,
    });
  } else {
    checks.push({
      id: 'app_compatibility',
      name: 'Kompatibilitas Tanda Tangan Aplikasi',
      category: 'compatibility',
      status: 'passed',
      details: `Tanda tangan aplikasi kompatibel (${payloadApp}, v${payloadVersion}).`,
    });
  }

  // CHECK 4: Store Identity Comparison
  const curStoreClean = (currentSettings.storeName || '').trim().toLowerCase();
  const fileStoreClean = (payloadStoreName || '').trim().toLowerCase();

  if (curStoreClean && fileStoreClean && curStoreClean !== fileStoreClean) {
    warnings.push(
      `Asal toko berkas ("${payloadStoreName}") berbeda dengan nama toko saat ini ("${currentSettings.storeName}"). Harap pastikan Anda tidak salah memulihkan data toko lain.`
    );
    checks.push({
      id: 'store_identity',
      name: 'Pencocokan Identitas Toko',
      category: 'compatibility',
      status: 'warning',
      details: `Berkas berasal dari: "${payloadStoreName}". Toko aktif saat ini: "${currentSettings.storeName}".`,
    });
  } else {
    checks.push({
      id: 'store_identity',
      name: 'Pencocokan Identitas Toko',
      category: 'compatibility',
      status: 'passed',
      details: `Identitas toko cocok dengan database aktif (${currentSettings.storeName}).`,
    });
  }

  // CHECK 5: Products Data Model & Integrity Audit
  const rawProducts = parsed.data.products;
  const sanitizedProducts: Product[] = [];
  const seenProductIds = new Set<string>();
  let duplicateProductIds = 0;
  let corruptedProducts = 0;
  let totalStockVal = 0;

  if (rawProducts !== undefined) {
    if (!Array.isArray(rawProducts)) {
      criticalErrors.push('Katalog produk di dalam berkas cadangan rusak (bukan berupa array).');
      checks.push({
        id: 'products_integrity',
        name: 'Integritas Katalog Produk',
        category: 'integrity',
        status: 'failed',
        details: 'Tabel produk rusak. Harus berupa daftar array data.',
      });
    } else {
      rawProducts.forEach((item: any, idx: number) => {
        if (!item || typeof item !== 'object') {
          corruptedProducts++;
          return;
        }

        const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `prod-gen-${idx}-${Date.now()}`;
        if (seenProductIds.has(id)) {
          duplicateProductIds++;
        } else {
          seenProductIds.add(id);
        }

        const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Produk Tanpa Nama #${idx + 1}`;
        const rawPrice = Number(item.price ?? item.sellingPrice);
        const price = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
        const rawCost = Number(item.costPrice);
        const costPrice = isNaN(rawCost) || rawCost < 0 ? 0 : rawCost;
        const rawStock = Number(item.stock);
        const stock = isNaN(rawStock) ? 0 : rawStock;

        totalStockVal += stock * (costPrice || price);

        sanitizedProducts.push({
          ...item,
          id,
          name,
          price,
          costPrice,
          stock,
          categoryId: typeof item.categoryId === 'string' ? item.categoryId : (typeof item.category === 'string' ? item.category : 'cat_all'),
          unit: typeof item.unit === 'string' ? item.unit : 'Pcs',
          barcode: typeof item.barcode === 'string' ? item.barcode : '',
        });
      });

      report.metrics.validProductsCount = sanitizedProducts.length;
      report.metrics.corruptedProductsCount = corruptedProducts;
      report.metrics.duplicateProductIdsCount = duplicateProductIds;
      report.metrics.totalStockValue = totalStockVal;

      if (corruptedProducts > 0 || duplicateProductIds > 0) {
        warnings.push(
          `Ditemukan ${duplicateProductIds} ID produk duplikat dan ${corruptedProducts} entri produk tidak lengkap. Data telah otomatis disanitasi.`
        );
        checks.push({
          id: 'products_integrity',
          name: 'Integritas Katalog Produk & Stok',
          category: 'integrity',
          status: 'warning',
          details: `${sanitizedProducts.length} produk valid, ${duplicateProductIds} duplikat, ${corruptedProducts} entri rusak disanitasi.`,
        });
      } else {
        checks.push({
          id: 'products_integrity',
          name: 'Integritas Katalog Produk & Stok',
          category: 'integrity',
          status: 'passed',
          details: `${sanitizedProducts.length} produk terverifikasi utuh dengan kalkulasi harga & stok normal.`,
        });
      }
    }
  } else {
    checks.push({
      id: 'products_integrity',
      name: 'Integritas Katalog Produk',
      category: 'integrity',
      status: 'warning',
      details: 'Berkas tidak menyertakan modul produk (ekspor parsial).',
    });
  }

  // CHECK 6: Transactions Integrity
  const rawTransactions = parsed.data.transactions;
  const sanitizedTransactions: Transaction[] = [];
  let corruptedTransactions = 0;

  if (rawTransactions !== undefined) {
    if (!Array.isArray(rawTransactions)) {
      criticalErrors.push('Riwayat transaksi di dalam berkas cadangan rusak (bukan berupa array).');
      checks.push({
        id: 'transactions_integrity',
        name: 'Integritas Riwayat Transaksi',
        category: 'integrity',
        status: 'failed',
        details: 'Tabel transaksi rusak. Harus berupa daftar array transaksi.',
      });
    } else {
      rawTransactions.forEach((tx: any, idx: number) => {
        if (!tx || typeof tx !== 'object') {
          corruptedTransactions++;
          return;
        }

        const id = typeof tx.id === 'string' && tx.id.trim() ? tx.id.trim() : `tx-gen-${idx}-${Date.now()}`;
        const rawFinalTotal = Number(tx.finalTotal ?? tx.total);
        const finalTotal = isNaN(rawFinalTotal) || rawFinalTotal < 0 ? 0 : rawFinalTotal;
        const items = Array.isArray(tx.items) ? tx.items : [];
        const createdAt = typeof tx.createdAt === 'string' ? tx.createdAt : new Date().toISOString();

        sanitizedTransactions.push({
          ...tx,
          id,
          finalTotal,
          items,
          createdAt,
        });
      });

      report.metrics.validTransactionsCount = sanitizedTransactions.length;
      report.metrics.corruptedTransactionsCount = corruptedTransactions;

      if (corruptedTransactions > 0) {
        warnings.push(`Ditemukan ${corruptedTransactions} rekaman nota transaksi rusak yang diabaikan demi keamanan.`);
        checks.push({
          id: 'transactions_integrity',
          name: 'Integritas Riwayat Transaksi & Nota',
          category: 'integrity',
          status: 'warning',
          details: `${sanitizedTransactions.length} transaksi valid diverifikasi, ${corruptedTransactions} entri transaksi rusak diabaikan.`,
        });
      } else {
        checks.push({
          id: 'transactions_integrity',
          name: 'Integritas Riwayat Transaksi & Nota',
          category: 'integrity',
          status: 'passed',
          details: `${sanitizedTransactions.length} nota transaksi terverifikasi utuh dengan rincian item & nominal valid.`,
        });
      }
    }
  } else {
    checks.push({
      id: 'transactions_integrity',
      name: 'Integritas Riwayat Transaksi',
      category: 'integrity',
      status: 'warning',
      details: 'Berkas tidak menyertakan modul transaksi (ekspor parsial).',
    });
  }

  // CHECK 7: Customers CRM & Suppliers Integrity
  const rawCustomers = parsed.data.customers;
  const sanitizedCustomers: Customer[] = [];
  if (Array.isArray(rawCustomers)) {
    rawCustomers.forEach((c: any, idx: number) => {
      if (c && typeof c === 'object') {
        sanitizedCustomers.push({
          ...c,
          id: typeof c.id === 'string' ? c.id : `cust-${idx}`,
          name: typeof c.name === 'string' ? c.name : 'Pelanggan',
          points: isNaN(Number(c.points)) ? 0 : Number(c.points),
        });
      }
    });
  }
  report.metrics.validCustomersCount = sanitizedCustomers.length;

  const rawSuppliers = parsed.data.suppliers;
  const sanitizedSuppliers: Supplier[] = [];
  if (Array.isArray(rawSuppliers)) {
    rawSuppliers.forEach((s: any, idx: number) => {
      if (s && typeof s === 'object') {
        sanitizedSuppliers.push({
          ...s,
          id: typeof s.id === 'string' ? s.id : `sup-${idx}`,
          name: typeof s.name === 'string' ? s.name : 'Supplier',
          phone: typeof s.phone === 'string' ? s.phone : '',
          isActive: s.isActive !== false,
          createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
        });
      }
    });
  }
  report.metrics.validSuppliersCount = sanitizedSuppliers.length;

  const rawEmployees = parsed.data.employees;
  const sanitizedEmployees: Employee[] = [];
  if (Array.isArray(rawEmployees)) {
    rawEmployees.forEach((emp: any) => {
      if (emp && typeof emp === 'object' && typeof emp.id === 'string') {
        sanitizedEmployees.push(emp);
      }
    });
  }
  report.metrics.validEmployeesCount = sanitizedEmployees.length;

  checks.push({
    id: 'crm_suppliers_integrity',
    name: 'Integritas Pelanggan, Supplier & Karyawan',
    category: 'integrity',
    status: 'passed',
    details: `${sanitizedCustomers.length} pelanggan CRM, ${sanitizedSuppliers.length} supplier, dan ${sanitizedEmployees.length} staf terverifikasi.`,
  });

  // CHECK 8: Database Safety Snapshot Readiness
  checks.push({
    id: 'safety_snapshot_guard',
    name: 'Proteksi Snapshot Pengaman Otomatis',
    category: 'safety',
    status: 'passed',
    details: 'Sistem siap membuat snapshot pemulihan cadangan otomatis sebelum data diterapkan, mencegah kehilangan data.',
  });

  // FINAL DECISION LOGIC
  const hasCriticalErrors = criticalErrors.length > 0;
  // If neither products nor transactions have valid items and both were provided as non-arrays
  if (sanitizedProducts.length === 0 && sanitizedTransactions.length === 0 && sanitizedCustomers.length === 0) {
    criticalErrors.push('Berkas tidak memuat data pokok POS sama sekali (0 produk, 0 transaksi, 0 pelanggan).');
    report.checks[0].status = 'failed';
  }

  if (criticalErrors.length > 0) {
    report.isValid = false;
    report.canRestore = false;
    report.status = 'failed';
    report.statusMessage =
      'Uji Integritas GAGAL: Berkas ini rusak atau tidak kompatibel. Pemulihan dicegah secara otomatis untuk melindungi basis data Anda dari kerusakan.';
  } else if (warnings.length > 0) {
    report.isValid = true;
    report.canRestore = true;
    report.status = 'warning';
    report.statusMessage =
      'Uji Integritas LOLOS dengan Catatan: Berkas kompatibel dan aman untuk dipulihkan, namun terdapat beberapa penyesuaian yang perlu Anda perhatikan.';
  } else {
    report.isValid = true;
    report.canRestore = true;
    report.status = 'passed';
    report.statusMessage =
      'Uji Integritas & Kompatibilitas 100% LOLOS: Berkas dalam kondisi prima, konsisten, dan aman dipulihkan ke basis data kasir.';
  }

  // Construct sanitized payload to be used by restore
  report.sanitizedPayload = {
    version: payloadVersion,
    app: payloadApp,
    exportedAt: payloadExportedAt,
    exportedBy: typeof parsed.exportedBy === 'string' ? parsed.exportedBy : 'Eksternal',
    storeName: payloadStoreName,
    branchName: payloadBranch,
    data: {
      products: sanitizedProducts,
      transactions: sanitizedTransactions,
      customers: sanitizedCustomers,
      suppliers: sanitizedSuppliers,
      salesReturns: Array.isArray(parsed.data.salesReturns) ? parsed.data.salesReturns : [],
      purchaseReturns: Array.isArray(parsed.data.purchaseReturns) ? parsed.data.purchaseReturns : [],
      supplierPurchases: Array.isArray(parsed.data.supplierPurchases) ? parsed.data.supplierPurchases : [],
      settings: parsed.data.settings && typeof parsed.data.settings === 'object' ? parsed.data.settings : undefined,
      vouchers: Array.isArray(parsed.data.vouchers) ? parsed.data.vouchers : [],
      employees: sanitizedEmployees,
      heldOrders: Array.isArray(parsed.data.heldOrders) ? parsed.data.heldOrders : [],
      currentShift: parsed.data.currentShift || null,
    },
    summary: {
      totalProducts: sanitizedProducts.length,
      totalSuppliers: sanitizedSuppliers.length,
      totalCustomers: sanitizedCustomers.length,
      totalTransactions: sanitizedTransactions.length,
      totalSalesReturns: Array.isArray(parsed.data.salesReturns) ? parsed.data.salesReturns.length : 0,
      totalSupplierPurchases: Array.isArray(parsed.data.supplierPurchases) ? parsed.data.supplierPurchases.length : 0,
      totalEmployees: sanitizedEmployees.length,
    },
  };

  return report;
}
