import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// Database storage configuration
const DATA_DIR = path.join(process.cwd(), 'data');
const SQLITE_FILE = path.join(DATA_DIR, 'pos-master.sqlite');
const LEGACY_JSON_FILE = path.join(DATA_DIR, 'lan-database.json');

let client: Client | null = null;
let isInitialized = false;
let databaseEngineInfo = {
  engine: 'SQLite Relational (WAL Mode)',
  journalMode: 'wal',
  synchronous: 'NORMAL',
  foreignKeys: true,
  filePath: SQLITE_FILE,
  lastHealthCheck: new Date().toISOString(),
  integrity: 'ok',
};

export function getSqliteClient(): Client {
  if (!client) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    client = createClient({
      url: `file:${SQLITE_FILE}`,
    });
  }
  return client;
}

export async function initSqliteMasterDatabase(): Promise<void> {
  if (isInitialized) return;

  const db = getSqliteClient();

  try {
    // 1. Enable WAL Mode (Write-Ahead Logging) for high concurrency & non-blocking reads/writes
    const pragmaWal = await db.execute('PRAGMA journal_mode = WAL;');
    const pragmaSync = await db.execute('PRAGMA synchronous = NORMAL;');
    await db.execute('PRAGMA foreign_keys = ON;');
    await db.execute('PRAGMA temp_store = MEMORY;');
    await db.execute('PRAGMA busy_timeout = 5000;');

    const walResult = pragmaWal.rows[0]?.[0] || pragmaWal.rows[0]?.journal_mode || 'wal';
    databaseEngineInfo.journalMode = String(walResult).toLowerCase();

    // 2. Create Relational Tables & Indexes
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        sku TEXT,
        barcode TEXT,
        category_id TEXT,
        price REAL NOT NULL DEFAULT 0,
        cost_price REAL NOT NULL DEFAULT 0,
        stock REAL NOT NULL DEFAULT 0,
        min_stock REAL NOT NULL DEFAULT 5,
        unit TEXT DEFAULT 'pcs',
        units_json TEXT,
        has_expiry INTEGER DEFAULT 0,
        expiry_date TEXT,
        image_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT NOT NULL
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_products_updated ON products(updated_at);`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL UNIQUE,
        order_type TEXT DEFAULT 'dine_in',
        table_number TEXT,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        items_json TEXT NOT NULL,
        subtotal REAL NOT NULL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        service_charge_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        voucher_code TEXT,
        points_used INTEGER DEFAULT 0,
        points_discount REAL DEFAULT 0,
        points_earned INTEGER DEFAULT 0,
        final_total REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL,
        payment_details_json TEXT NOT NULL,
        cashier_name TEXT NOT NULL,
        branch_name TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        sync_status TEXT NOT NULL DEFAULT 'synced',
        synced_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_number);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_transactions_payment ON transactions(payment_method);`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS transaction_items (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        barcode TEXT,
        unit_price REAL NOT NULL,
        quantity REAL NOT NULL,
        selected_unit TEXT,
        unit_multiplier REAL DEFAULT 1,
        total_price REAL NOT NULL,
        cost_price REAL DEFAULT 0,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_tx_items_tx ON transaction_items(transaction_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_tx_items_prod ON transaction_items(product_id);`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        tier TEXT DEFAULT 'Silver',
        points INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0,
        orders_count INTEGER DEFAULT 0,
        address TEXT,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT NOT NULL
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        lead_time_days INTEGER DEFAULT 3,
        created_at TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS held_orders (
        id TEXT PRIMARY KEY,
        reference_name TEXT NOT NULL,
        cashier_name TEXT,
        order_type TEXT,
        items_json TEXT NOT NULL,
        subtotal REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_audit_logs (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        cashier_name TEXT,
        event_type TEXT NOT NULL,
        records_synced INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_sync_audit_created ON sync_audit_logs(created_at);`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS server_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 3. Data Migration / Seeding from JSON or Defaults
    const countCheck = await db.execute('SELECT COUNT(*) as count FROM products;');
    const prodCount = Number(countCheck.rows[0]?.count ?? 0);

    if (prodCount === 0) {
      console.log('[SQLite Server] Products table empty, checking legacy JSON or seeding initial FMCG catalog...');
      await seedFromLegacyJsonOrDefaults();
    }

    // 4. Run SQLite Integrity Check
    const integrityRes = await db.execute('PRAGMA integrity_check;');
    databaseEngineInfo.integrity = String(integrityRes.rows[0]?.[0] || 'ok');

    isInitialized = true;
    console.log(
      `[SQLite Server] Relational Master DB Initialized in WAL Mode. Path: ${SQLITE_FILE}. Integrity: ${databaseEngineInfo.integrity}`
    );
  } catch (err: any) {
    console.error('[SQLite Server] Error during database initialization:', err);
    throw err;
  }
}

// Seed helper
async function seedFromLegacyJsonOrDefaults(): Promise<void> {
  const db = getSqliteClient();
  const now = new Date().toISOString();

  let productsToInsert: any[] = [];
  let transactionsToInsert: any[] = [];
  let customersToInsert: any[] = [];
  let suppliersToInsert: any[] = [];

  if (fs.existsSync(LEGACY_JSON_FILE)) {
    try {
      const raw = fs.readFileSync(LEGACY_JSON_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.products) && data.products.length > 0) {
        productsToInsert = data.products;
      }
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        transactionsToInsert = data.transactions;
      }
      if (Array.isArray(data.customers) && data.customers.length > 0) {
        customersToInsert = data.customers;
      }
      if (Array.isArray(data.suppliers) && data.suppliers.length > 0) {
        suppliersToInsert = data.suppliers;
      }
      console.log(`[SQLite Server] Migrating data from legacy JSON: ${productsToInsert.length} products, ${transactionsToInsert.length} transactions`);
    } catch (e) {
      console.warn('[SQLite Server] Could not parse legacy JSON, using FMCG defaults:', e);
    }
  }

  // Fallback defaults if no products in JSON
  if (productsToInsert.length === 0) {
    productsToInsert = [
      {
        id: 'prod-001',
        name: 'Indomie Mi Goreng Spesial 85g',
        brand: 'Indomie',
        sku: 'IND-MIE-GOR',
        barcode: '8998866200115',
        categoryId: 'instant',
        price: 3500,
        costPrice: 2800,
        stock: 120,
        minStock: 20,
        unit: 'pcs',
        isActive: 1,
      },
      {
        id: 'prod-002',
        name: 'Minyak Goreng Sania Pouch 2L',
        brand: 'Sania',
        sku: 'SAN-OIL-2L',
        barcode: '8992775211025',
        categoryId: 'sembako',
        price: 34000,
        costPrice: 30500,
        stock: 35,
        minStock: 10,
        unit: 'pouch',
        isActive: 1,
      },
      {
        id: 'prod-003',
        name: 'Beras Premium Ramos Setra 5kg',
        brand: 'Ramos',
        sku: 'BER-RAM-5K',
        barcode: '8996001410144',
        categoryId: 'sembako',
        price: 72000,
        costPrice: 65000,
        stock: 25,
        minStock: 8,
        unit: 'karung',
        isActive: 1,
      },
      {
        id: 'prod-004',
        name: 'Gula Pasir Gulaku Tebu Kuning 1kg',
        brand: 'Gulaku',
        sku: 'GUL-TEB-1K',
        barcode: '8993077110052',
        categoryId: 'sembako',
        price: 18500,
        costPrice: 16500,
        stock: 45,
        minStock: 12,
        unit: 'kg',
        isActive: 1,
      },
      {
        id: 'prod-005',
        name: 'Teh Botol Sosro Kotak 250ml',
        brand: 'Sosro',
        sku: 'SOS-TEH-250',
        barcode: '8998866100122',
        categoryId: 'beverages',
        price: 4000,
        costPrice: 3200,
        stock: 60,
        minStock: 15,
        unit: 'kotak',
        isActive: 1,
      },
    ];
  }

  // Insert products
  await upsertProducts(productsToInsert);

  // Insert customers if any
  if (customersToInsert.length > 0) {
    await upsertCustomers(customersToInsert);
  }

  // Insert suppliers if any
  if (suppliersToInsert.length > 0) {
    await upsertSuppliers(suppliersToInsert);
  }

  // Insert transactions if any
  if (transactionsToInsert.length > 0) {
    await upsertTransactions(transactionsToInsert, 'migration', 'System Init');
  }

  // Mark metadata
  await db.execute({
    sql: 'INSERT OR REPLACE INTO server_metadata (key, value, updated_at) VALUES (?, ?, ?)',
    args: ['database_seeded_at', now, now],
  });
}

// -------------------------------------------------------------
// PRODUCT OPERATIONS (ACID)
// -------------------------------------------------------------
export async function getAllProducts(): Promise<any[]> {
  const db = getSqliteClient();
  const res = await db.execute(`
    SELECT * FROM products ORDER BY name ASC;
  `);

  return res.rows.map((r: any) => {
    let units: any = undefined;
    if (r.units_json) {
      try {
        units = JSON.parse(r.units_json);
      } catch {}
    }
    return {
      id: r.id,
      name: r.name,
      brand: r.brand,
      sku: r.sku,
      barcode: r.barcode,
      categoryId: r.category_id,
      price: Number(r.price),
      costPrice: Number(r.cost_price),
      stock: Number(r.stock),
      minStock: Number(r.min_stock),
      unit: r.unit || 'pcs',
      units,
      hasExpiry: Boolean(r.has_expiry),
      expiryDate: r.expiry_date,
      imageUrl: r.image_url,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

export async function upsertProducts(products: any[]): Promise<number> {
  if (!Array.isArray(products) || products.length === 0) return 0;
  const db = getSqliteClient();
  const now = new Date().toISOString();

  let count = 0;
  // Use batch transaction for atomic execution
  const statements = products.map((p) => {
    count++;
    return {
      sql: `
        INSERT INTO products (
          id, name, brand, sku, barcode, category_id, price, cost_price, stock, min_stock,
          unit, units_json, has_expiry, expiry_date, image_url, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          brand = excluded.brand,
          sku = excluded.sku,
          barcode = excluded.barcode,
          category_id = excluded.category_id,
          price = excluded.price,
          cost_price = excluded.cost_price,
          stock = excluded.stock,
          min_stock = excluded.min_stock,
          unit = excluded.unit,
          units_json = excluded.units_json,
          has_expiry = excluded.has_expiry,
          expiry_date = excluded.expiry_date,
          image_url = excluded.image_url,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at;
      `,
      args: [
        p.id,
        p.name || 'Produk Tanpa Nama',
        p.brand || null,
        p.sku || null,
        p.barcode || null,
        p.categoryId || 'general',
        Number(p.price || 0),
        Number(p.costPrice || 0),
        Number(p.stock || 0),
        Number(p.minStock ?? 5),
        p.unit || 'pcs',
        p.units ? JSON.stringify(p.units) : null,
        p.hasExpiry ? 1 : 0,
        p.expiryDate || null,
        p.imageUrl || null,
        p.isActive !== false ? 1 : 0,
        p.createdAt || now,
        p.updatedAt || now,
      ],
    };
  });

  await db.batch(statements, 'write');
  return count;
}

export async function deductProductStock(
  items: Array<{ productId: string; quantity: number; unitMultiplier?: number }>
): Promise<Array<{ productId: string; newStock: number }>> {
  if (!items || items.length === 0) return [];
  const db = getSqliteClient();
  const now = new Date().toISOString();

  const updatedStocks: Array<{ productId: string; newStock: number }> = [];

  for (const item of items) {
    const pId = item.productId;
    const mult = item.unitMultiplier || 1;
    const deductQty = (item.quantity || 1) * mult;

    const cur = await db.execute({
      sql: 'SELECT stock FROM products WHERE id = ?;',
      args: [pId],
    });

    if (cur.rows.length > 0) {
      const currentStock = Number(cur.rows[0]?.stock || 0);
      const newStock = Math.max(0, currentStock - deductQty);

      await db.execute({
        sql: 'UPDATE products SET stock = ?, updated_at = ? WHERE id = ?;',
        args: [newStock, now, pId],
      });

      updatedStocks.push({ productId: pId, newStock });
    }
  }

  return updatedStocks;
}

// -------------------------------------------------------------
// TRANSACTION OPERATIONS (ACID)
// -------------------------------------------------------------
function mapRowToTransaction(r: any) {
  let items: any[] = [];
  let payment: any = { method: r.payment_method };
  try {
    if (r.items_json) items = JSON.parse(r.items_json);
  } catch {}
  try {
    if (r.payment_details_json) payment = JSON.parse(r.payment_details_json);
  } catch {}

  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    orderType: r.order_type,
    tableNumber: r.table_number,
    customer: r.customer_id
      ? { id: r.customer_id, name: r.customer_name, phone: r.customer_phone }
      : undefined,
    items,
    subtotal: Number(r.subtotal),
    taxAmount: Number(r.tax_amount),
    serviceChargeAmount: Number(r.service_charge_amount),
    discountAmount: Number(r.discount_amount),
    voucherCode: r.voucher_code,
    pointsUsed: Number(r.points_used),
    pointsDiscount: Number(r.points_discount),
    pointsEarned: Number(r.points_earned),
    finalTotal: Number(r.final_total),
    payment,
    customerDiscount: (payment as any)?.customerDiscount || undefined,
    customerDiscountAmount: (payment as any)?.customerDiscountAmount ? Number((payment as any).customerDiscountAmount) : undefined,
    cashierName: r.cashier_name,
    branchName: r.branch_name,
    status: r.status,
    syncStatus: r.sync_status,
    syncedAt: r.synced_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getAllTransactions(limit = 1000): Promise<any[]> {
  const db = getSqliteClient();
  const res = await db.execute({
    sql: `SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?;`,
    args: [limit],
  });

  return res.rows.map(mapRowToTransaction);
}

export interface PaginatedTransactionsOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  syncStatus?: string;
  search?: string;
}

export interface PaginatedTransactionsResponse {
  transactions: any[];
  totalCount: number;
  totalSalesAmount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor: string | null;
  period: {
    startDate?: string;
    endDate?: string;
  };
}

export async function queryTransactionsPaginated(
  options: PaginatedTransactionsOptions = {}
): Promise<PaginatedTransactionsResponse> {
  const db = getSqliteClient();
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 25));

  const conditions: string[] = [];
  const args: any[] = [];

  // 1. Date boundaries (ISO String comparison on indexed created_at)
  if (options.startDate) {
    const startIso = options.startDate.includes('T')
      ? options.startDate
      : `${options.startDate}T00:00:00.000Z`;
    conditions.push('created_at >= ?');
    args.push(startIso);
  }

  if (options.endDate) {
    const endIso = options.endDate.includes('T')
      ? options.endDate
      : `${options.endDate}T23:59:59.999Z`;
    conditions.push('created_at <= ?');
    args.push(endIso);
  }

  // 2. Payment Method Filter
  if (options.paymentMethod && options.paymentMethod !== 'all') {
    conditions.push('payment_method = ?');
    args.push(options.paymentMethod);
  }

  // 3. Sync Status Filter
  if (options.syncStatus && options.syncStatus !== 'all') {
    conditions.push('sync_status = ?');
    args.push(options.syncStatus);
  }

  // 4. Search Filter (Invoice, Customer, Cashier, Item)
  if (options.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      '(invoice_number LIKE ? OR customer_name LIKE ? OR cashier_name LIKE ? OR items_json LIKE ?)'
    );
    args.push(term, term, term, term);
  }

  // Calculate Count & Totals inside SQLite
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countSql = `SELECT COUNT(*) as count, COALESCE(SUM(final_total), 0) as total_sales FROM transactions ${whereClause};`;
  const countRes = await db.execute({ sql: countSql, args: [...args] });
  const totalCount = Number(countRes.rows[0]?.count || 0);
  const totalSalesAmount = Number(countRes.rows[0]?.total_sales || 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Build query with cursor or offset
  let dataSql = '';
  const dataArgs = [...args];

  if (options.cursor) {
    // Cursor format: "ISO_DATE|ID" or ISO_DATE
    const [cursorDate, cursorId] = options.cursor.includes('|')
      ? options.cursor.split('|')
      : [options.cursor, ''];

    const cursorConditions = [...conditions];
    if (cursorId) {
      cursorConditions.push('(created_at < ? OR (created_at = ? AND id < ?))');
      dataArgs.push(cursorDate, cursorDate, cursorId);
    } else {
      cursorConditions.push('created_at < ?');
      dataArgs.push(cursorDate);
    }

    const cursorWhere = cursorConditions.length > 0 ? `WHERE ${cursorConditions.join(' AND ')}` : '';
    dataSql = `SELECT * FROM transactions ${cursorWhere} ORDER BY created_at DESC, id DESC LIMIT ?;`;
    dataArgs.push(pageSize + 1);
  } else {
    const offset = (page - 1) * pageSize;
    dataSql = `SELECT * FROM transactions ${whereClause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?;`;
    dataArgs.push(pageSize + 1, offset);
  }

  const res = await db.execute({ sql: dataSql, args: dataArgs });
  const hasNextPage = res.rows.length > pageSize;
  const itemsRows = hasNextPage ? res.rows.slice(0, pageSize) : res.rows;
  const transactions = itemsRows.map(mapRowToTransaction);

  let nextCursor: string | null = null;
  if (hasNextPage && transactions.length > 0) {
    const lastItem = transactions[transactions.length - 1];
    nextCursor = `${lastItem.createdAt}|${lastItem.id}`;
  }

  return {
    transactions,
    totalCount,
    totalSalesAmount,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage: page > 1,
    nextCursor,
    period: {
      startDate: options.startDate,
      endDate: options.endDate,
    },
  };
}

export async function upsertTransactions(
  transactions: any[],
  deviceId = 'pos-terminal',
  cashierName = 'Kasir'
): Promise<{ syncedCount: number; syncedIds: string[] }> {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { syncedCount: 0, syncedIds: [] };
  }

  const db = getSqliteClient();
  const now = new Date().toISOString();
  const syncedIds: string[] = [];

  const statements: Array<{ sql: string; args: any[] }> = [];

  for (const tx of transactions) {
    if (!tx || (!tx.id && !tx.invoiceNumber)) continue;
    const txId = tx.id || tx.invoiceNumber;
    syncedIds.push(txId);

    const invoiceNumber = tx.invoiceNumber || `INV-${txId}`;
    const custId = tx.customer?.id || null;
    const custName = tx.customer?.name || null;
    const custPhone = tx.customer?.phone || null;
    const itemsJson = JSON.stringify(tx.items || []);
    const paymentJson = JSON.stringify({
      ...(tx.payment || { method: 'cash' }),
      customerDiscount: tx.customerDiscount || undefined,
      customerDiscountAmount: tx.customerDiscountAmount || undefined,
    });
    const paymentMethod = tx.payment?.method || 'cash';

    // 1. Transaction header upsert
    statements.push({
      sql: `
        INSERT INTO transactions (
          id, invoice_number, order_type, table_number, customer_id, customer_name, customer_phone,
          items_json, subtotal, tax_amount, service_charge_amount, discount_amount, voucher_code,
          points_used, points_discount, points_earned, final_total, payment_method, payment_details_json,
          cashier_name, branch_name, status, sync_status, synced_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          invoice_number = excluded.invoice_number,
          order_type = excluded.order_type,
          table_number = excluded.table_number,
          customer_id = excluded.customer_id,
          customer_name = excluded.customer_name,
          customer_phone = excluded.customer_phone,
          items_json = excluded.items_json,
          subtotal = excluded.subtotal,
          tax_amount = excluded.tax_amount,
          service_charge_amount = excluded.service_charge_amount,
          discount_amount = excluded.discount_amount,
          voucher_code = excluded.voucher_code,
          points_used = excluded.points_used,
          points_discount = excluded.points_discount,
          points_earned = excluded.points_earned,
          final_total = excluded.final_total,
          payment_method = excluded.payment_method,
          payment_details_json = excluded.payment_details_json,
          cashier_name = excluded.cashier_name,
          branch_name = excluded.branch_name,
          status = excluded.status,
          sync_status = excluded.sync_status,
          synced_at = excluded.synced_at,
          updated_at = excluded.updated_at;
      `,
      args: [
        txId,
        invoiceNumber,
        tx.orderType || 'dine_in',
        tx.tableNumber || null,
        custId,
        custName,
        custPhone,
        itemsJson,
        Number(tx.subtotal || 0),
        Number(tx.taxAmount || 0),
        Number(tx.serviceChargeAmount || 0),
        Number(tx.discountAmount || 0),
        tx.voucherCode || null,
        Number(tx.pointsUsed || 0),
        Number(tx.pointsDiscount || 0),
        Number(tx.pointsEarned || 0),
        Number(tx.finalTotal || 0),
        paymentMethod,
        paymentJson,
        tx.cashierName || cashierName,
        tx.branchName || null,
        tx.status || 'completed',
        'synced',
        now,
        tx.createdAt || now,
        now,
      ],
    });

    // 2. Relational line items
    if (Array.isArray(tx.items)) {
      // Clear previous items for this tx if update
      statements.push({
        sql: 'DELETE FROM transaction_items WHERE transaction_id = ?;',
        args: [txId],
      });

      for (let idx = 0; idx < tx.items.length; idx++) {
        const item = tx.items[idx];
        const lineId = `${txId}-line-${idx}`;
        const prodId = item.product?.id || item.productId || `prod-${idx}`;
        const prodName = item.product?.name || item.productName || 'Barang';
        const barcode = item.product?.barcode || item.barcode || null;
        const unitPrice = Number(item.unitPrice || item.price || 0);
        const qty = Number(item.quantity || 1);
        const totalPrice = Number(item.totalPrice || unitPrice * qty);
        const costPrice = Number(item.product?.costPrice || item.costPrice || 0);
        const unit = item.selectedUnit?.name || item.unit || 'pcs';
        const mult = Number(item.selectedUnit?.multiplier || 1);

        statements.push({
          sql: `
            INSERT INTO transaction_items (
              id, transaction_id, product_id, product_name, barcode, unit_price, quantity,
              selected_unit, unit_multiplier, total_price, cost_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          args: [
            lineId,
            txId,
            prodId,
            prodName,
            barcode,
            unitPrice,
            qty,
            unit,
            mult,
            totalPrice,
            costPrice,
          ],
        });
      }
    }
  }

  // 3. Record Audit Log
  const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  statements.push({
    sql: `
      INSERT INTO sync_audit_logs (id, device_id, cashier_name, event_type, records_synced, status, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    args: [
      auditId,
      deviceId,
      cashierName,
      'transactions_sync',
      syncedIds.length,
      'success',
      `Synchronized ${syncedIds.length} transactions via ACID transaction.`,
      now,
    ],
  });

  // Execute entire batch inside single ACID transaction in SQLite
  await db.batch(statements, 'write');

  return { syncedCount: syncedIds.length, syncedIds };
}

// -------------------------------------------------------------
// CUSTOMER OPERATIONS
// -------------------------------------------------------------
export async function getAllCustomers(): Promise<any[]> {
  const db = getSqliteClient();
  const res = await db.execute(`SELECT * FROM customers ORDER BY name ASC;`);
  return res.rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    tier: r.tier || 'Silver',
    points: Number(r.points || 0),
    totalSpent: Number(r.total_spent || 0),
    ordersCount: Number(r.orders_count || 0),
    address: r.address,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function upsertCustomers(customers: any[]): Promise<number> {
  if (!Array.isArray(customers) || customers.length === 0) return 0;
  const db = getSqliteClient();
  const now = new Date().toISOString();

  const statements = customers.map((c) => ({
    sql: `
      INSERT INTO customers (id, name, phone, email, tier, points, total_spent, orders_count, address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        tier = excluded.tier,
        points = excluded.points,
        total_spent = excluded.total_spent,
        orders_count = excluded.orders_count,
        address = excluded.address,
        notes = excluded.notes,
        updated_at = excluded.updated_at;
    `,
    args: [
      c.id,
      c.name,
      c.phone || null,
      c.email || null,
      c.tier || 'Silver',
      Number(c.points || 0),
      Number(c.totalSpent || 0),
      Number(c.ordersCount || 0),
      c.address || null,
      c.notes || null,
      c.createdAt || now,
      c.updatedAt || now,
    ],
  }));

  await db.batch(statements, 'write');
  return customers.length;
}

// -------------------------------------------------------------
// SUPPLIERS OPERATIONS
// -------------------------------------------------------------
export async function getAllSuppliers(): Promise<any[]> {
  const db = getSqliteClient();
  const res = await db.execute(`SELECT * FROM suppliers ORDER BY name ASC;`);
  return res.rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    contactPerson: r.contact_person,
    phone: r.phone,
    email: r.email,
    address: r.address,
    leadTimeDays: Number(r.lead_time_days || 3),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function upsertSuppliers(suppliers: any[]): Promise<number> {
  if (!Array.isArray(suppliers) || suppliers.length === 0) return 0;
  const db = getSqliteClient();
  const now = new Date().toISOString();

  const statements = suppliers.map((s) => ({
    sql: `
      INSERT INTO suppliers (id, name, code, contact_person, phone, email, address, lead_time_days, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        code = excluded.code,
        contact_person = excluded.contact_person,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address,
        lead_time_days = excluded.lead_time_days,
        updated_at = excluded.updated_at;
    `,
    args: [
      s.id,
      s.name,
      s.code || null,
      s.contactPerson || null,
      s.phone || null,
      s.email || null,
      s.address || null,
      Number(s.leadTimeDays || 3),
      s.createdAt || now,
      s.updatedAt || now,
    ],
  }));

  await db.batch(statements, 'write');
  return suppliers.length;
}

// -------------------------------------------------------------
// HELD ORDERS OPERATIONS
// -------------------------------------------------------------
export async function getAllHeldOrders(): Promise<any[]> {
  const db = getSqliteClient();
  const res = await db.execute(`SELECT * FROM held_orders ORDER BY created_at DESC;`);
  return res.rows.map((r: any) => {
    let items: any[] = [];
    try {
      if (r.items_json) items = JSON.parse(r.items_json);
    } catch {}
    return {
      id: r.id,
      referenceName: r.reference_name,
      cashierName: r.cashier_name,
      orderType: r.order_type,
      items,
      subtotal: Number(r.subtotal || 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

export async function saveHeldOrder(order: any): Promise<void> {
  const db = getSqliteClient();
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO held_orders (id, reference_name, cashier_name, order_type, items_json, subtotal, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        reference_name = excluded.reference_name,
        cashier_name = excluded.cashier_name,
        order_type = excluded.order_type,
        items_json = excluded.items_json,
        subtotal = excluded.subtotal,
        updated_at = excluded.updated_at;
    `,
    args: [
      order.id,
      order.referenceName || order.reference || 'Pesanan Tertahan',
      order.cashierName || 'Kasir',
      order.orderType || 'dine_in',
      JSON.stringify(order.items || []),
      Number(order.subtotal || 0),
      order.createdAt || now,
      now,
    ],
  });
}

export async function deleteHeldOrder(id: string): Promise<boolean> {
  const db = getSqliteClient();
  const res = await db.execute({
    sql: 'DELETE FROM held_orders WHERE id = ?;',
    args: [id],
  });
  return (res.rowsAffected || 0) > 0;
}

// -------------------------------------------------------------
// DATABASE STATUS & METRICS
// -------------------------------------------------------------
export async function getDatabaseStatus(): Promise<any> {
  const db = getSqliteClient();

  const [pCount, tCount, cCount, sCount, hCount, aCount] = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM products;'),
    db.execute('SELECT COUNT(*) as c FROM transactions;'),
    db.execute('SELECT COUNT(*) as c FROM customers;'),
    db.execute('SELECT COUNT(*) as c FROM suppliers;'),
    db.execute('SELECT COUNT(*) as c FROM held_orders;'),
    db.execute('SELECT COUNT(*) as c FROM sync_audit_logs;'),
  ]);

  let fileSizeKb = 0;
  try {
    if (fs.existsSync(SQLITE_FILE)) {
      const stat = fs.statSync(SQLITE_FILE);
      fileSizeKb = Math.round(stat.size / 1024);
    }
  } catch {}

  return {
    ...databaseEngineInfo,
    fileSizeKb,
    counts: {
      products: Number(pCount.rows[0]?.c || 0),
      transactions: Number(tCount.rows[0]?.c || 0),
      customers: Number(cCount.rows[0]?.c || 0),
      suppliers: Number(sCount.rows[0]?.c || 0),
      heldOrders: Number(hCount.rows[0]?.c || 0),
      auditLogs: Number(aCount.rows[0]?.c || 0),
    },
    serverTime: new Date().toISOString(),
  };
}

export async function checkDatabaseIntegrity(): Promise<any> {
  const db = getSqliteClient();
  const res = await db.execute('PRAGMA integrity_check;');
  const val = String(res.rows[0]?.[0] || 'ok');
  databaseEngineInfo.integrity = val;
  databaseEngineInfo.lastHealthCheck = new Date().toISOString();
  return {
    integrity: val,
    checkedAt: databaseEngineInfo.lastHealthCheck,
    journalMode: databaseEngineInfo.journalMode,
    engine: databaseEngineInfo.engine,
  };
}

