/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { POSProvider, usePOS } from './context/POSContext';
import { Header } from './components/Header';
import { ProductCatalog } from './components/ProductCatalog';
import { CartPanel } from './components/CartPanel';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { TransactionsView } from './components/views/TransactionsView';
import { InventoryView } from './components/views/InventoryView';
import { CustomersView } from './components/views/CustomersView';
import { ReportsView } from './components/views/ReportsView';
import { GeminiRetailCopilot } from './components/GeminiRetailCopilot';
import { EmployeeLockScreen } from './components/EmployeeLockScreen';
import { FirstRunSetup } from './components/FirstRunSetup';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGlobalDialogA11y } from './hooks/useGlobalDialogA11y';
import { EmployeeManagementModal } from './components/EmployeeManagementModal';
import { ShiftModal } from './components/ShiftModal';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { OfflineNotificationBanner } from './components/OfflineNotificationBanner';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { UnregisteredBarcodeModal } from './components/UnregisteredBarcodeModal';
import { ProductFormModal } from './components/ProductFormModal';
import { AccessDeniedView } from './components/AccessDeniedView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ShelfProductLiveModal } from './components/ShelfProductLiveModal';
import { isViewAllowed, getDefaultView } from './utils/permissions';
import { formatCurrency } from './utils/formatters';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useIsDesktop } from './hooks/useIsDesktop';

const POSMainApp: React.FC = () => {
  // Escape, fokus, dan role="dialog" untuk semua jendela modal (lihat hook)
  useGlobalDialogA11y();
  // Judul jendela: nama toko (dulu "Point of Sales")
  const { settings: appSettings } = usePOS();
  useEffect(() => {
    const store = (appSettings?.storeName || '').trim();
    document.title = store ? `${store} — Ulilmart POS` : 'Ulilmart POS';
  }, [appSettings?.storeName]);
  const {
    activeView,
    setActiveView,
    activeEmployee,
    employees,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    activeReceipt,
    setActiveReceipt,
    isReceiptFromNewPayment,
    isBackupRestoreOpen,
    setIsBackupRestoreOpen,
    isEmployeeManagementOpen,
    isShiftModalOpen,
    setIsShiftModalOpen,
    isSyncModalOpen,
    isBarcodeScannerOpen,
    isUnregisteredBarcodeModalOpen,
    setIsUnregisteredBarcodeModalOpen,
    unregisteredBarcode,
    addToCart,
    cart,
    finalTotal,
    settings,
  } = usePOS();

  // Mobile POS view state: toggle between catalog and cart
  const isDesktop = useIsDesktop();
  const [mobilePosTab, setMobilePosTab] = useState<'catalog' | 'cart'>('catalog');

  // Authorized Add Product modal state (triggered after supervisor/owner approves an unregistered barcode)
  const [authorizedProductConfig, setAuthorizedProductConfig] = useState<{
    isOpen: boolean;
    barcode: string;
    authorizer: { authorizedBy: string; authorizerRole: string } | null;
  }>({
    isOpen: false,
    barcode: '',
    authorizer: null,
  });

  // Dynamic QR Shelf Scanned Product ID (detects ?shelf=... in URL)
  const [scannedShelfProductId, setScannedShelfProductId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('shelf') || params.get('qr_product') || null;
    }
    return null;
  });

  useEffect(() => {
    const handleUrlCheck = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const shelfId = params.get('shelf') || params.get('qr_product');
        if (shelfId) {
          setScannedShelfProductId(shelfId);
        }
      }
    };

    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, []);

  const handleCloseShelfModal = () => {
    setScannedShelfProductId(null);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.delete('shelf');
      url.searchParams.delete('qr_product');
      const cleanPath = url.pathname + (url.search ? url.search : '');
      window.history.replaceState({}, '', cleanPath);
    }
  };

  // If the logged-in employee role cannot view the activeView, automatically shift to their default view
  useEffect(() => {
    if (activeEmployee && !isViewAllowed(activeEmployee.role, activeView)) {
      setActiveView(getDefaultView(activeEmployee.role));
    }
  }, [activeEmployee]);

  const isCurrentViewAllowed = isViewAllowed(activeEmployee?.role, activeView);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Top Main Navigation Header */}
      <Header />

      {/* Offline Status & Cloud Sync Notification Banner */}
      <OfflineNotificationBanner />

      {/* Main Content Viewport with mobile padding for bottom nav */}
      <main className="flex-1 flex overflow-hidden pb-14 md:pb-0 relative">
        {!isCurrentViewAllowed ? (
          <AccessDeniedView attemptedView={activeView} />
        ) : (
          <>
            {activeView === 'pos' && (
              <div className="flex-1 h-full overflow-hidden">
                {/* Desktop & Tablet: Side-by-Side 12-column grid (hanya dirender di layar lebar) */}
                {isDesktop && (
                <div className="hidden md:grid md:grid-cols-12 h-full overflow-hidden">
                  <div className="md:col-span-7 xl:col-span-8 h-full overflow-hidden">
                    <ErrorBoundary variant="section" label="Katalog Produk"><ProductCatalog /></ErrorBoundary>
                  </div>
                  <div className="md:col-span-5 xl:col-span-4 h-full overflow-hidden">
                    <ErrorBoundary variant="section" label="Keranjang"><CartPanel /></ErrorBoundary>
                  </div>
                </div>

                )}

                {/* Mobile Single-Screen View: Switch between Catalog and Cart (hanya di layar sempit) */}
                {!isDesktop && (
                <div className="md:hidden h-full flex flex-col relative overflow-hidden">
                  {mobilePosTab === 'catalog' ? (
                    <div className="flex-1 h-full overflow-hidden relative">
                      <ErrorBoundary variant="section" label="Katalog Produk"><ProductCatalog /></ErrorBoundary>

                      {/* Mobile Floating Cart Summary Button when items are in cart */}
                      {totalCartCount > 0 && (
                        <div className="absolute bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom-2 fade-in">
                          <button
                            type="button"
                            id="mobile-btn-open-cart-floating"
                            onClick={() => setMobilePosTab('cart')}
                            className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/30 flex items-center justify-between active:scale-98 transition-all border border-emerald-400/40"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-slate-950/25 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <div className="text-[11px] uppercase font-bold text-emerald-100 tracking-wider">
                                  Keranjang ({totalCartCount} item)
                                </div>
                                <div className="font-mono font-black text-sm">
                                  {formatCurrency(finalTotal, settings.currency)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-black bg-white text-emerald-900 px-3 py-1.5 rounded-xl shadow-sm">
                              <span>Buka &amp; Bayar</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 h-full overflow-hidden">
                      <ErrorBoundary variant="section" label="Keranjang"><CartPanel onBackToCatalog={() => setMobilePosTab('catalog')} /></ErrorBoundary>
                    </div>
                  )}
                </div>
                )}
              </div>
            )}

            {activeView === 'transactions' && (
              <ErrorBoundary variant="section" label="TransactionsView" resetKeys={[activeView]}>
                <TransactionsView />
              </ErrorBoundary>
            )}
            {activeView === 'inventory' && (
              <ErrorBoundary variant="section" label="InventoryView" resetKeys={[activeView]}>
                <InventoryView />
              </ErrorBoundary>
            )}
            {activeView === 'customers' && (
              <ErrorBoundary variant="section" label="CustomersView" resetKeys={[activeView]}>
                <CustomersView />
              </ErrorBoundary>
            )}
            {activeView === 'reports' && (
              <ErrorBoundary variant="section" label="ReportsView" resetKeys={[activeView]}>
                <ReportsView />
              </ErrorBoundary>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Fixed at bottom on screens < md) */}
      <MobileBottomNav />

      {/* Root Modals */}
      {isPaymentModalOpen && (
        <ErrorBoundary variant="section" floating label="PaymentModal"><PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
        /></ErrorBoundary>
      )}

      {activeReceipt && (
        <ErrorBoundary variant="section" floating label="ReceiptModal"><ReceiptModal
          transaction={activeReceipt}
          isOpen={Boolean(activeReceipt)}
          isNewPayment={isReceiptFromNewPayment}
          onClose={() => setActiveReceipt(null)}
        /></ErrorBoundary>
      )}

      {/* Gemini AI Retail Copilot Drawer */}
      <ErrorBoundary variant="section" floating label="GeminiRetailCopilot"><GeminiRetailCopilot /></ErrorBoundary>

      {/* Employee Login & Screen Lock */}
      <EmployeeLockScreen />

      {/* Instalasi baru (belum ada karyawan): pendaftaran akun Owner */}
      {employees.length === 0 && <FirstRunSetup />}

      {/* Employee Management Modal */}
      {isEmployeeManagementOpen && <ErrorBoundary variant="section" floating label="EmployeeManagementModal"><EmployeeManagementModal /></ErrorBoundary>}

      {/* Shift Summary & Drawer Reconciliation Modal */}
      {isShiftModalOpen && (
        <ErrorBoundary variant="section" floating label="ShiftModal"><ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
        /></ErrorBoundary>
      )}

      {/* Offline Caching & Cloud Background Sync Modal */}
      {isSyncModalOpen && <ErrorBoundary variant="section" floating label="OfflineSyncModal"><OfflineSyncModal /></ErrorBoundary>}

      {/* Camera Barcode Scanner Modal with Auto-Add */}
      {isBarcodeScannerOpen && <ErrorBoundary variant="section" floating label="BarcodeScannerModal"><BarcodeScannerModal /></ErrorBoundary>}

      {/* Backup & Restore Points Disaster Recovery Center */}
      <ErrorBoundary variant="section" floating label="BackupRestoreModal"><BackupRestoreModal
        isOpen={isBackupRestoreOpen}
        onClose={() => setIsBackupRestoreOpen(false)}
      /></ErrorBoundary>

      {/* Prompt Tambah Produk Barcode Belum Terdaftar (Otoritas Supervisor / Owner) */}
      {isUnregisteredBarcodeModalOpen && (
        <ErrorBoundary variant="section" floating label="UnregisteredBarcodeModal"><UnregisteredBarcodeModal
          isOpen={isUnregisteredBarcodeModalOpen}
          barcode={unregisteredBarcode}
          onClose={() => setIsUnregisteredBarcodeModalOpen(false)}
          onAuthorizeSuccess={(barcode, authorizer) => {
            setIsUnregisteredBarcodeModalOpen(false);
            setAuthorizedProductConfig({
              isOpen: true,
              barcode,
              authorizer,
            });
          }}
        /></ErrorBoundary>
      )}

      {/* Authorized Product Creation Modal (Auto adds to POS cart on save) */}
      {authorizedProductConfig.isOpen && (
        <ErrorBoundary variant="section" floating label="ProductFormModal"><ProductFormModal
          isOpen={authorizedProductConfig.isOpen}
          onClose={() =>
            setAuthorizedProductConfig({
              isOpen: false,
              barcode: '',
              authorizer: null,
            })
          }
          initialBarcode={authorizedProductConfig.barcode}
          authorizationInfo={authorizedProductConfig.authorizer}
          onSuccess={(savedProduct) => {
            setAuthorizedProductConfig({
              isOpen: false,
              barcode: '',
              authorizer: null,
            });
            addToCart(savedProduct);
          }}
        /></ErrorBoundary>
      )}

      {/* Scanned QR Shelf Product Live Verification Modal */}
      {scannedShelfProductId && (
        <ErrorBoundary variant="section" floating label="ShelfProductLiveModal"><ShelfProductLiveModal
          productId={scannedShelfProductId}
          isOpen={Boolean(scannedShelfProductId)}
          onClose={handleCloseShelfModal}
        /></ErrorBoundary>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <POSProvider>
        <POSMainApp />
      </POSProvider>
    </ThemeProvider>
  );
}
