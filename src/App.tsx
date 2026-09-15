/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
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
import { isViewAllowed, getDefaultView } from './utils/permissions';

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
  } = usePOS();

  // If the logged-in employee role cannot view the activeView, automatically shift to their default view
  useEffect(() => {
    if (activeEmployee && !isViewAllowed(activeEmployee.role, activeView)) {
      setActiveView(getDefaultView(activeEmployee.role));
    }
  }, [activeEmployee]);

  const isCurrentViewAllowed = isViewAllowed(activeEmployee?.role, activeView);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Top Main Navigation Header */}
      <Header />

      {/* Offline Status & Cloud Sync Notification Banner */}
      <OfflineNotificationBanner />

      {/* Main Content Viewport */}
      <main className="flex-1 flex overflow-hidden">
        {!isCurrentViewAllowed ? (
          <AccessDeniedView attemptedView={activeView} />
        ) : (
          <>
            {activeView === 'pos' && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 h-full overflow-hidden">
                {/* Catalog Grid Area (7 cols on desktop, 8 on wide) */}
                <div className="col-span-1 md:col-span-7 xl:col-span-8 h-full overflow-hidden">
                  <ProductCatalog />
                </div>

                {/* Cart Order Terminal Panel (5 cols on desktop, 4 on wide) */}
                <div className="col-span-1 md:col-span-5 xl:col-span-4 h-full overflow-hidden">
                  <CartPanel />
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
      <EmployeeManagementModal />

      {/* Shift Summary & Drawer Reconciliation Modal */}
      <ShiftModal />

      {/* Offline Caching & Cloud Background Sync Modal */}
      <OfflineSyncModal />

      {/* Camera Barcode Scanner Modal with Auto-Add */}
      <BarcodeScannerModal />

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
