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
import { EmployeeManagementModal } from './components/EmployeeManagementModal';
import { ShiftModal } from './components/ShiftModal';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { OfflineNotificationBanner } from './components/OfflineNotificationBanner';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { AccessDeniedView } from './components/AccessDeniedView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { isViewAllowed, getDefaultView } from './utils/permissions';
import { formatCurrency } from './utils/formatters';
import { ShoppingBag, ArrowRight } from 'lucide-react';

const POSMainApp: React.FC = () => {
  const {
    activeView,
    setActiveView,
    activeEmployee,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    activeReceipt,
    setActiveReceipt,
    isBackupRestoreOpen,
    setIsBackupRestoreOpen,
    isEmployeeManagementOpen,
    isShiftModalOpen,
    setIsShiftModalOpen,
    isSyncModalOpen,
    isBarcodeScannerOpen,
    cart,
    finalTotal,
    settings,
  } = usePOS();

  // Mobile POS view state: toggle between catalog and cart
  const [mobilePosTab, setMobilePosTab] = useState<'catalog' | 'cart'>('catalog');

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
                {/* Desktop & Tablet: Side-by-Side 12-column grid */}
                <div className="hidden md:grid md:grid-cols-12 h-full overflow-hidden">
                  <div className="md:col-span-7 xl:col-span-8 h-full overflow-hidden">
                    <ProductCatalog />
                  </div>
                  <div className="md:col-span-5 xl:col-span-4 h-full overflow-hidden">
                    <CartPanel />
                  </div>
                </div>

                {/* Mobile Single-Screen View: Switch between Catalog and Cart */}
                <div className="md:hidden h-full flex flex-col relative overflow-hidden">
                  {mobilePosTab === 'catalog' ? (
                    <div className="flex-1 h-full overflow-hidden relative">
                      <ProductCatalog />

                      {/* Mobile Floating Cart Summary Button when items are in cart */}
                      {totalCartCount > 0 && (
                        <div className="absolute bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom-2 fade-in">
                          <button
                            type="button"
                            id="mobile-btn-open-cart-floating"
                            onClick={() => setMobilePosTab('cart')}
                            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/30 flex items-center justify-between active:scale-98 transition-all border border-emerald-400/40"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-slate-950/25 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <div className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">
                                  Keranjang ({totalCartCount} item)
                                </div>
                                <div className="font-mono font-black text-sm">
                                  {formatCurrency(finalTotal, settings.currency)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-black bg-white text-emerald-900 px-3 py-1.5 rounded-xl shadow-xs">
                              <span>Buka &amp; Bayar</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 h-full overflow-hidden">
                      <CartPanel onBackToCatalog={() => setMobilePosTab('catalog')} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'transactions' && <TransactionsView />}
            {activeView === 'inventory' && <InventoryView />}
            {activeView === 'customers' && <CustomersView />}
            {activeView === 'reports' && <ReportsView />}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Fixed at bottom on screens < md) */}
      <MobileBottomNav />

      {/* Root Modals */}
      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {activeReceipt && (
        <ReceiptModal
          transaction={activeReceipt}
          isOpen={Boolean(activeReceipt)}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Gemini AI Retail Copilot Drawer */}
      <GeminiRetailCopilot />

      {/* Employee Login & Screen Lock */}
      <EmployeeLockScreen />

      {/* Employee Management Modal */}
      {isEmployeeManagementOpen && <EmployeeManagementModal />}

      {/* Shift Summary & Drawer Reconciliation Modal */}
      {isShiftModalOpen && (
        <ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
        />
      )}

      {/* Offline Caching & Cloud Background Sync Modal */}
      {isSyncModalOpen && <OfflineSyncModal />}

      {/* Camera Barcode Scanner Modal with Auto-Add */}
      {isBarcodeScannerOpen && <BarcodeScannerModal />}

      {/* Backup & Restore Points Disaster Recovery Center */}
      <BackupRestoreModal
        isOpen={isBackupRestoreOpen}
        onClose={() => setIsBackupRestoreOpen(false)}
      />
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
