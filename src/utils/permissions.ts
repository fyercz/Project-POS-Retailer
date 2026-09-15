import { EmployeeRole, AppView, RolePermissions } from '../types';

export const DEFAULT_ROLE_PERMISSIONS: Record<EmployeeRole, RolePermissions> = {
  cashier: {
    role: 'cashier',
    roleLabel: 'Kasir (Frontliner)',
    allowedViews: ['pos', 'transactions'],
    canEditStock: false,
    canEditPrices: false,
    canVoidTransaction: false,
    canApplyCustomDiscount: true,
    canViewReports: false,
    canManageEmployees: false,
    canManageSettings: false,
    description: 'Melayani transaksi penjualan kasir, scan barcode, cetak nota, dan order parkir/pending.',
  },
  inventory: {
    role: 'inventory',
    roleLabel: 'Admin Gudang & Stok',
    allowedViews: ['inventory', 'transactions'],
    canEditStock: true,
    canEditPrices: false,
    canVoidTransaction: false,
    canApplyCustomDiscount: false,
    canViewReports: false,
    canManageEmployees: false,
    canManageSettings: false,
    description: 'Mengelola stok fisik, barang masuk PO supplier, retur barang supplier, dan stok opname.',
  },
  supervisor: {
    role: 'supervisor',
    roleLabel: 'Supervisor / Kepala Toko',
    allowedViews: ['pos', 'transactions', 'inventory', 'customers', 'reports'],
    canEditStock: true,
    canEditPrices: true,
    canVoidTransaction: true,
    canApplyCustomDiscount: true,
    canViewReports: true,
    canManageEmployees: false,
    canManageSettings: false,
    description: 'Supervisi operasional harian, otorisasi void transaksi, pantau stok, member, dan laporan omzet.',
  },
  owner: {
    role: 'owner',
    roleLabel: 'Pemilik Toko (Owner)',
    allowedViews: ['pos', 'transactions', 'inventory', 'customers', 'reports'],
    canEditStock: true,
    canEditPrices: true,
    canVoidTransaction: true,
    canApplyCustomDiscount: true,
    canViewReports: true,
    canManageEmployees: true,
    canManageSettings: true,
    description: 'Akses mutlak ke seluruh modul: analisis laba rugi & margin, kelola master staf, dan konfigurasi toko.',
  },
};

/**
 * Check if a view is allowed for a given employee role
 */
export function isViewAllowed(role: EmployeeRole | undefined, view: AppView): boolean {
  if (!role) return false;
  const permissions = DEFAULT_ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.allowedViews.includes(view);
}

/**
 * Check specific functional permission (e.g. canManageSettings, canVoidTransaction)
 */
export function hasActionPermission(
  role: EmployeeRole | undefined,
  action: keyof Omit<RolePermissions, 'role' | 'roleLabel' | 'allowedViews' | 'description'>
): boolean {
  if (!role) return false;
  const permissions = DEFAULT_ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return Boolean(permissions[action]);
}

/**
 * Get the default landing view for an employee role
 */
export function getDefaultView(role: EmployeeRole | undefined): AppView {
  switch (role) {
    case 'inventory':
      return 'inventory';
    case 'cashier':
    case 'supervisor':
    case 'owner':
    default:
      return 'pos';
  }
}

/**
 * Friendly Indonesian title for an AppView
 */
export function getViewTitle(view: AppView): string {
  switch (view) {
    case 'pos':
      return 'Kasir (POS)';
    case 'transactions':
      return 'Riwayat Nota';
    case 'inventory':
      return 'Katalog & Stok';
    case 'customers':
      return 'Member & Poin';
    case 'reports':
      return 'Laporan & Omzet';
    default:
      return view;
  }
}

/**
 * Get the minimum role recommendation for a restricted view
 */
export function getRequiredRoleForView(view: AppView): string {
  switch (view) {
    case 'reports':
      return 'Supervisor atau Owner';
    case 'customers':
      return 'Supervisor atau Owner';
    case 'inventory':
      return 'Admin Gudang, Supervisor, atau Owner';
    case 'pos':
      return 'Kasir, Supervisor, atau Owner';
    default:
      return 'Otoritas Khusus';
  }
}
