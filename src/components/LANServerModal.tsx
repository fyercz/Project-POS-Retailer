import React, { useState, useEffect, useCallback } from 'react';
import {
  Network,
  Server,
  Wifi,
  WifiOff,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Laptop,
  Smartphone,
  Tablet,
  ShieldCheck,
  Download,
  Upload,
  Activity,
  Database,
  Users,
  ShoppingBag,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Info,
  QrCode,
  HelpCircle,
  X,
  ChevronRight,
  Terminal,
  Globe,
  Radio,
  Sparkles,
} from 'lucide-react';
import { LANConfig, LANRole, LANServerStatus, LANClient, LANServerLog, Product, Transaction, Customer, Supplier } from '../types';
import {
  getLANConfig,
  saveLANConfig,
  fetchLANServerStatus,
  testLANConnection,
  registerLANClient,
  pullLANMasterData,
  seedLANServerDatabase,
  fetchLANSharedHeldOrders,
  deleteLANSharedHeldOrder,
} from '../utils/lanSyncManager';
import { LANTroubleshootPanel } from './LANTroubleshootPanel';

interface LANServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  onApplyMasterData?: (data: { products: Product[]; transactions?: Transaction[]; customers?: Customer[]; suppliers?: Supplier[] }) => void;
  onRecallSharedHeldOrder?: (heldOrder: any) => void;
}

export const LANServerModal: React.FC<LANServerModalProps> = ({
  isOpen,
  onClose,
  products,
  transactions,
  customers,
  suppliers,
  onApplyMasterData,
  onRecallSharedHeldOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'hub' | 'clients' | 'held_orders' | 'logs' | 'guide' | 'troubleshoot'>('hub');
  const [accessMode, setAccessMode] = useState<'wifi_lan' | 'cloud'>('wifi_lan');
  const [config, setConfig] = useState<LANConfig>(getLANConfig());
  const [serverStatus, setServerStatus] = useState<LANServerStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedFirewall, setCopiedFirewall] = useState(false);
  const [customIpInput, setCustomIpInput] = useState(config.customHostIp || '');
  const [pingResult, setPingResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs: number;
    error?: string;
  } | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [sharedHeldOrders, setSharedHeldOrders] = useState<any[]>([]);
  const [isLoadingHeldOrders, setIsLoadingHeldOrders] = useState(false);

  // Load current config and fetch status
  const refreshStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const status = await fetchLANServerStatus(config.serverUrl);
      setServerStatus(status);
    } catch {
      setServerStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [config.serverUrl]);

  const refreshHeldOrders = useCallback(async () => {
    setIsLoadingHeldOrders(true);
    try {
      const orders = await fetchLANSharedHeldOrders();
      setSharedHeldOrders(orders);
    } catch {
      setSharedHeldOrders([]);
    } finally {
      setIsLoadingHeldOrders(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setConfig(getLANConfig());
      refreshStatus();
      refreshHeldOrders();
    }
  }, [isOpen, refreshStatus, refreshHeldOrders]);

  // Periodic status poll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      refreshStatus();
      if (activeTab === 'held_orders') {
        refreshHeldOrders();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isOpen, refreshStatus, refreshHeldOrders, activeTab]);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: LANRole) => {
    const updated = saveLANConfig({ role: newRole });
    setConfig(updated);
    registerLANClient();
    setActionNotice({
      type: 'info',
      text: `Peran diubah menjadi: ${newRole === 'HOST' ? 'Server Master (Host Toko)' : newRole === 'CLIENT' ? 'Terminal Klien' : 'Mandiri (Standalone)'}`,
    });
    setTimeout(() => setActionNotice(null), 4000);
    refreshStatus();
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingResult(null);
    const res = await testLANConnection(config.serverUrl);
    setPingResult({
      tested: true,
      success: res.success,
      latencyMs: res.latencyMs,
      error: res.error,
    });
    setIsPinging(false);
    if (res.success && res.status) {
      setServerStatus(res.status);
    }
  };

  // Seed master database from local state
  const handleSeedServer = async () => {
    if (!confirm('Apakah Anda yakin ingin mengunggah dan menjadikan data produk kasir lokal ini sebagai Master Database Server LAN?')) {
      return;
    }
    setIsSeeding(true);
    const res = await seedLANServerDatabase({
      products,
      customers,
      suppliers,
      transactions,
    });
    setIsSeeding(false);
    if (res.success) {
      setActionNotice({
        type: 'success',
        text: `Berhasil! ${products.length} produk dan data ritel lokal telah disinkronkan ke Master Server Database LAN.`,
      });
      refreshStatus();
    } else {
      setActionNotice({
        type: 'warn',
        text: `Gagal: ${res.error}`,
      });
    }
    setTimeout(() => setActionNotice(null), 6000);
  };

  // Pull master data to local client
  const handlePullMaster = async () => {
    setIsPulling(true);
    const data = await pullLANMasterData();
    setIsPulling(false);
    if (data && data.products.length > 0) {
      if (onApplyMasterData) {
        onApplyMasterData({
          products: data.products,
          transactions: data.transactions,
          customers: data.customers,
          suppliers: data.suppliers,
        });
      }
      setActionNotice({
        type: 'success',
        text: `Berhasil mengunduh ${data.products.length} produk & ${data.transactions.length} transaksi dari Server Master LAN!`,
      });
      refreshStatus();
    } else {
      setActionNotice({
        type: 'warn',
        text: 'Tidak ada data produk dari server LAN atau server belum siap.',
      });
    }
    setTimeout(() => setActionNotice(null), 6000);
  };

  const handleRecallOrder = (order: any) => {
    if (onRecallSharedHeldOrder) {
      onRecallSharedHeldOrder(order);
      deleteLANSharedHeldOrder(order.id);
      refreshHeldOrders();
      onClose();
    }
  };

  const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:3000';
  
  // Detect if running in cloud/web environment or local browser
  const isCloudOrWeb = typeof window !== 'undefined' && (
    window.location.hostname.includes('.run.app') || 
    window.location.hostname.includes('.app') || 
    (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.startsWith('192.168.') && !window.location.hostname.startsWith('10.'))
  );

  // Fallback public cloud app url
  const publicCloudUrl = isCloudOrWeb
    ? currentOrigin
    : (serverStatus?.webOrigin && !serverStatus.webOrigin.includes('localhost')
      ? serverStatus.webOrigin
      : 'https://ais-pre-fafdjlqxtxjxzjf3s3mlj2-699502230590.asia-east1.run.app');

  // Real local Wi-Fi IP detection
  const detectedLanIp = serverStatus?.localIps?.find(
    (ip) => ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );

  const effectiveHostIp = (config.customHostIp && config.customHostIp.trim())
    ? config.customHostIp.trim()
    : (detectedLanIp || (serverStatus?.primaryIp && !serverStatus.primaryIp.startsWith('127.') && !serverStatus.primaryIp.startsWith('169.254.') ? serverStatus.primaryIp : ''));

  const port = serverStatus?.port || 3000;
  const localWifiUrl = effectiveHostIp ? `http://${effectiveHostIp}:${port}` : `http://localhost:${port}`;
  const isLocalhostDetected = !effectiveHostIp || effectiveHostIp === '127.0.0.1' || effectiveHostIp === 'localhost';

  // Active URL to display based on mode
  const activeDisplayUrl = accessMode === 'cloud'
    ? publicCloudUrl
    : (effectiveHostIp ? `http://${effectiveHostIp}:${port}` : currentOrigin);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(activeDisplayUrl)}`;

  const handleSaveCustomIp = (ipToSave: string) => {
    const cleaned = ipToSave.trim().replace(/^https?:\/\//, '').replace(/:.*$/, '');
    const updated = saveLANConfig({ customHostIp: cleaned });
    setConfig(updated);
    setCustomIpInput(cleaned);
    setActionNotice({
      type: 'success',
      text: `Alamat IP Wi-Fi PC Kasir berhasil disimpan: ${cleaned}. QR Code telah diperbarui!`,
    });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleCopyFirewall = () => {
    const cmd = 'netsh advfirewall firewall add rule name="POS Kasir Port 3000" dir=in action=allow protocol=TCP localport=3000';
    navigator.clipboard.writeText(cmd);
    setCopiedFirewall(true);
    setTimeout(() => setCopiedFirewall(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="lan-server-modal-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
                  Server Database Multi-Client LAN
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  LAN Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Konektivitas multi-kasir terpadu dalam 1 jaringan WiFi/LAN toko ritel tanpa internet eksternal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-refresh-lan-status"
              onClick={refreshStatus}
              disabled={isLoadingStatus}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Segarkan Status Server LAN"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              id="btn-close-lan-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice Alert Banner */}
        {actionNotice && (
          <div
            className={`px-5 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : actionNotice.type === 'warn'
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              )}
              <span>{actionNotice.text}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-xs font-bold underline opacity-70 hover:opacity-100">
              Tutup
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-5 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto bg-slate-50/40 dark:bg-slate-900/40 shrink-0">
          <button
            id="tab-lan-hub"
            onClick={() => setActiveTab('hub')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'hub'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Server Hub &amp; Pengaturan</span>
          </button>

          <button
            id="tab-lan-clients"
            onClick={() => setActiveTab('clients')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'clients'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Perangkat Terhubung</span>
            {serverStatus?.connectedClients && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {serverStatus.connectedClients.filter((c) => c.isOnline).length}
              </span>
            )}
          </button>

          <button
            id="tab-lan-held"
            onClick={() => {
              setActiveTab('held_orders');
              refreshHeldOrders();
            }}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'held_orders'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Parkir Antar-Kasir</span>
            {sharedHeldOrders.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-white font-bold">
                {sharedHeldOrders.length}
              </span>
            )}
          </button>

          <button
            id="tab-lan-logs"
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Log Aktivitas LAN</span>
          </button>

          <button
            id="tab-lan-guide"
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Panduan Jaringan 1-Menit</span>
          </button>

          <button
            id="tab-lan-troubleshoot"
            onClick={() => setActiveTab('troubleshoot')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'troubleshoot'
                ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Solusi Kasir HP / Wi-Fi</span>
            <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
              Penting
            </span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: SERVER HUB & CONFIGURATION */}
          {activeTab === 'hub' && (
            <div className="space-y-6">
              {/* Role Selection Segmented Control */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5 block">
                  Pilih Peran Perangkat Ini dalam Jaringan Toko:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    id="btn-role-host"
                    onClick={() => handleRoleChange('HOST')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      config.role === 'HOST'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Server Master (Host)</span>
                        {config.role === 'HOST' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        PC Utama toko sebagai pusat database &amp; penyimpanan katalog
                      </p>
                    </div>
                  </button>

                  <button
                    id="btn-role-client"
                    onClick={() => handleRoleChange('CLIENT')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      config.role === 'CLIENT'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Terminal Klien</span>
                        {config.role === 'CLIENT' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Kasir 2, Kasir 3, Tablet Gudang terhubung ke IP Host
                      </p>
                    </div>
                  </button>

                  <button
                    id="btn-role-standalone"
                    onClick={() => handleRoleChange('STANDALONE')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      config.role === 'STANDALONE'
                        ? 'border-slate-600 bg-slate-100 dark:bg-slate-800 dark:border-slate-500 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Mandiri (Offline)</span>
                        {config.role === 'STANDALONE' && <Check className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Kasir tunggal tanpa koneksi ke kasir lain
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* HOST VIEW DETAILS */}
              {config.role === 'HOST' && (
                <div className="space-y-6">
                  {/* DUAL MODE SELECTOR HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Metode Membuka di HP / Kasir Lain:
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        id="btn-mode-wifi-lan"
                        onClick={() => setAccessMode('wifi_lan')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          accessMode === 'wifi_lan'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        <span>Wi-Fi Lokal Toko (LAN)</span>
                      </button>

                      <button
                        id="btn-mode-cloud"
                        onClick={() => setAccessMode('cloud')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          accessMode === 'cloud'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Akses Cloud / Online</span>
                        <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-500 text-white font-bold">
                          Termudah
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* LAN Connection Address Card with QR Code */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-50 to-blue-500/10 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/30 border border-indigo-200 dark:border-indigo-900/60 flex flex-col md:flex-row items-center gap-6">
                    {/* Left details */}
                    <div className="flex-1 space-y-3.5 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {accessMode === 'wifi_lan'
                              ? 'Alamat Wi-Fi Lokal Toko (Buka di HP / Kasir Lain):'
                              : 'Alamat Link Cloud Publik (Langsung Buka di HP):'}
                          </h3>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                          {accessMode === 'wifi_lan' ? 'Port 3000' : 'HTTPS Cloud'}
                        </span>
                      </div>

                      {/* Warning if localhost is used for Wi-Fi */}
                      {accessMode === 'wifi_lan' && isLocalhostDetected && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Jangan Gunakan 'localhost' di Handphone!</span>
                          </div>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                            Di browser HP, <em>localhost</em> merujuk ke HP itu sendiri sehingga gagal terhubung. Masukkan IP Wi-Fi PC Kasir Anda di bawah (contoh: <strong>192.168.1.15</strong>).
                          </p>
                        </div>
                      )}

                      {/* IP Customization Input for WiFi Mode */}
                      {accessMode === 'wifi_lan' && (
                        <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/70">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                            <span>Alamat IP Wi-Fi PC Kasir Ini:</span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('troubleshoot')}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <HelpCircle className="w-3 h-3" />
                              <span>Cara cek IP di Windows</span>
                            </button>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customIpInput}
                              onChange={(e) => setCustomIpInput(e.target.value)}
                              placeholder="Contoh: 192.168.1.15"
                              className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCustomIp(customIpInput)}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                            >
                              Terapkan IP
                            </button>
                          </div>

                          {/* Detected IP suggestions if any */}
                          {serverStatus?.localIps && serverStatus.localIps.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>Saran IP Terdeteksi:</span>
                              {serverStatus.localIps.map((ip) => (
                                <button
                                  key={ip}
                                  type="button"
                                  onClick={() => {
                                    setCustomIpInput(ip);
                                    handleSaveCustomIp(ip);
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] hover:bg-indigo-100 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                                >
                                  {ip}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {accessMode === 'wifi_lan'
                          ? 'Ketik alamat ini di browser Chrome pada Kasir 2, Kasir 3, atau Handphone yang terhubung ke Wi-Fi toko:'
                          : 'Buka link publik ini langsung dari HP mana saja (bisa lewat Wi-Fi toko maupun Kuota Seluler 4G/5G):'}
                      </p>

                      <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-2 rounded-xl border border-indigo-200 dark:border-indigo-900/80 shadow-xs">
                        <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 px-2 flex-1 select-all break-all">
                          {activeDisplayUrl}
                        </span>
                        <button
                          id="btn-copy-lan-url"
                          onClick={() => handleCopyUrl(activeDisplayUrl)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUrl ? 'Tersalin' : 'Salin Link'}</span>
                        </button>
                        <a
                          href={activeDisplayUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                          title="Buka di Tab Baru"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      {/* Quick Action Helpers */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {accessMode === 'wifi_lan' && (
                          <button
                            type="button"
                            onClick={handleCopyFirewall}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Terminal className="w-3 h-3 text-indigo-500" />
                            <span>{copiedFirewall ? 'Perintah Firewall Tersalin!' : 'Salin Perintah Buka Firewall Port 3000'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveTab('troubleshoot')}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Masih Gagal Terhubung di HP? Buka Solusi &rarr;</span>
                        </button>
                      </div>
                    </div>

                    {/* QR Code Quick Scan for Mobile/Tablet */}
                    <div className="flex flex-col items-center bg-white dark:bg-slate-950 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs shrink-0 text-center w-full sm:w-48">
                      <div className="p-1 rounded-xl bg-white border border-slate-200 dark:border-slate-800 shadow-xs">
                        <img
                          src={qrCodeUrl}
                          alt="QR Code Sambungan Kasir"
                          className="w-36 h-36 rounded-lg bg-white"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-2.5">
                        <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Scan Kamera HP / Tablet</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {accessMode === 'wifi_lan' ? 'Buka instan via Wi-Fi toko' : 'Buka instan lewat internet cloud'}
                      </span>
                    </div>
                  </div>

                  {/* Database Master Stats Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Master Produk</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {serverStatus?.stats?.totalProducts ?? products.length}
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Stok Terpusat</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Semua Transaksi Kasir</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {serverStatus?.stats?.totalTransactions ?? transactions.length}
                      </div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Terkumpul di Server</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Member Terdaftar</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {serverStatus?.stats?.totalCustomers ?? customers.length}
                      </div>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Poin &amp; Diskon Berbagi</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Terminal Kasir Aktif</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {serverStatus?.connectedClients?.filter((c) => c.isOnline).length || 1}
                      </div>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Online di Jaringan</span>
                    </div>
                  </div>

                  {/* Actions & Synchronization Controls */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Pengelolaan Data Master Server LAN:
                    </h4>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        id="btn-seed-master-db"
                        onClick={handleSeedServer}
                        disabled={isSeeding}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isSeeding ? 'Mengunggah...' : 'Jadikan Data Kasir Ini sebagai Master Server'}</span>
                      </button>

                      <button
                        id="btn-pull-master-db"
                        onClick={handlePullMaster}
                        disabled={isPulling}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isPulling ? 'Menarik...' : 'Tarik Update dari Server Master'}</span>
                      </button>

                      <a
                        href="/api/lan/data/pull"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Ekspor JSON Master Database</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* CLIENT VIEW DETAILS */}
              {config.role === 'CLIENT' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-4">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        Pengaturan Sambungan ke Server Kasir Master
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                          Alamat IP / URL Server Master Toko:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={config.serverUrl}
                            onChange={(e) => {
                              const nextUrl = e.target.value;
                              const updated = saveLANConfig({ serverUrl: nextUrl });
                              setConfig(updated);
                            }}
                            placeholder="http://192.168.1.105:3000"
                            className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                          />
                          <button
                            id="btn-ping-server"
                            onClick={handleTestPing}
                            disabled={isPinging}
                            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                            <span>{isPinging ? 'Uji...' : 'Ping'}</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                          Nama Terminal Kasir Ini:
                        </label>
                        <input
                          type="text"
                          value={config.clientName}
                          onChange={(e) => {
                            const nextName = e.target.value;
                            const updated = saveLANConfig({ clientName: nextName });
                            setConfig(updated);
                          }}
                          placeholder="Kasir 2 (Meja Depan)"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Ping Result Indicator */}
                    {pingResult && (
                      <div
                        className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                          pingResult.success
                            ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-100/70 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {pingResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Terhubung ke Server Kasir Utama! Latensi: <strong>{pingResult.latencyMs} ms</strong> (Sangat Cepat &amp; Responsif).
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                              Gagal terhubung: {pingResult.error || 'Periksa apakah PC Server Master sudah berjalan dan berada di WiFi yang sama.'}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions for Client */}
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      id="btn-pull-catalog-from-master"
                      onClick={handlePullMaster}
                      disabled={isPulling}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isPulling ? 'Mengunduh Katalog...' : 'Tarik Seluruh Katalog dari Server Master'}</span>
                    </button>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        id="check-auto-sync"
                        checked={config.autoSync}
                        onChange={(e) => {
                          const updated = saveLANConfig({ autoSync: e.target.checked });
                          setConfig(updated);
                        }}
                        className="rounded-sm accent-blue-600 cursor-pointer"
                      />
                      <label htmlFor="check-auto-sync" className="cursor-pointer font-medium">
                        Auto-Sync Real-Time (Setiap {config.syncInterval} detik)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STANDALONE VIEW */}
              {config.role === 'STANDALONE' && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Mode Kasir Mandiri (Standalone) Aktif
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Pada mode ini, kasir beroperasi secara lokal tanpa sinkronisasi multi-terminal. Untuk menghubungkan dengan kasir lain di toko, ubah peran menjadi <strong>Server Master</strong> atau <strong>Terminal Klien</strong> di atas.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONNECTED CLIENTS & TERMINALS */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Daftar Terminal Kasir &amp; Perangkat Toko
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Perangkat yang terdaftar dan berkomunikasi dengan Server Database LAN
                  </p>
                </div>
                <button
                  onClick={refreshStatus}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Segarkan</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Host Card */}
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        👑
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>Server Kasir 1 (Master Hub)</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-mono">
                          {serverStatus?.primaryIp || '127.0.0.1'}:{serverStatus?.port || 3000}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                      Host Toko
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-indigo-100 dark:border-indigo-900/40 text-slate-600 dark:text-slate-400">
                    <div>
                      Uptime Server: <strong className="text-slate-800 dark:text-slate-200">{serverStatus?.serverUptime ? `${Math.floor(serverStatus.serverUptime / 60)} menit` : 'Aktif'}</strong>
                    </div>
                    <div>
                      Database: <strong className="text-slate-800 dark:text-slate-200">{serverStatus?.stats?.dbSizeKb || 40} KB</strong>
                    </div>
                  </div>
                </div>

                {/* Connected Clients from Server Store */}
                {serverStatus?.connectedClients && serverStatus.connectedClients.length > 0 ? (
                  serverStatus.connectedClients.map((client) => (
                    <div
                      key={client.id}
                      className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                        client.isOnline
                          ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          : 'border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            {client.deviceType === 'mobile' ? (
                              <Smartphone className="w-4 h-4" />
                            ) : client.deviceType === 'tablet' ? (
                              <Tablet className="w-4 h-4" />
                            ) : (
                              <Laptop className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{client.name}</span>
                              <span
                                className={`w-2 h-2 rounded-full ${client.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
                              ></span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              IP: {client.ip || '192.168.1.X'}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            client.isOnline
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {client.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        <div>
                          Transaksi: <strong className="text-slate-800 dark:text-slate-200">{client.transactionsCount || 0} TRX</strong>
                        </div>
                        <div className="truncate">
                          Terakhir: <strong className="text-slate-800 dark:text-slate-200">
                            {client.lastSeen ? new Date(client.lastSeen).toLocaleTimeString('id-ID') : '-'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400">
                    Belum ada kasir klien tambahan yang terhubung. Buka alamat URL di laptop kasir 2 atau scan QR Code di tab Server Hub.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SHARED HELD ORDERS */}
          {activeTab === 'held_orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Pesanan yang Diparkir Antar-Kasir (Shared Held Orders)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Jika pelanggan di Kasir 1 lupa dompet atau ambil barang tambahan, Kasir 2 atau Kasir 3 dapat langsung membuka belanjaan ini dan menyelesaikan pembayaran!
                  </p>
                </div>
                <button
                  onClick={refreshHeldOrders}
                  disabled={isLoadingHeldOrders}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHeldOrders ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {sharedHeldOrders.length > 0 ? (
                <div className="space-y-3">
                  {sharedHeldOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-900 dark:text-amber-200">
                            {order.referenceNumber || `#${order.id.slice(-6)}`}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold">
                            Diparkir di: {order.parkedAtTerminal || 'Kasir 1'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {order.items?.length || 0} item barang • Subtotal:{' '}
                          <strong className="text-slate-900 dark:text-slate-100">
                            Rp {(order.subtotal || 0).toLocaleString('id-ID')}
                          </strong>
                        </div>
                        {order.note && (
                          <p className="text-[11px] text-amber-800 dark:text-amber-300 italic">
                            Catatan: &ldquo;{order.note}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRecallOrder(order)}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Buka di Kasir Ini</span>
                        </button>
                        <button
                          onClick={async () => {
                            await deleteLANSharedHeldOrder(order.id);
                            refreshHeldOrders();
                          }}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Batalkan Pesanan Parkir"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tidak ada pesanan yang sedang diparkir
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Ketika kasir memarkir transaksi (Order Parking), pesanan otomatis tersinkronisasi ke server LAN dan dapat dipanggil oleh kasir manapun.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REAL-TIME LAN LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Log Real-Time Server LAN
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aktivitas transaksi, deduksi stok otomatis, dan koneksi kasir
                  </p>
                </div>
                <button
                  onClick={refreshStatus}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Segarkan</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto space-y-2 border border-slate-800">
                {serverStatus?.recentLogs && serverStatus.recentLogs.length > 0 ? (
                  serverStatus.recentLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-500 shrink-0 select-none">
                        [{new Date(log.timestamp).toLocaleTimeString('id-ID')}]
                      </span>
                      <span
                        className={`font-bold select-none ${
                          log.level === 'success'
                            ? 'text-emerald-400'
                            : log.level === 'warn'
                            ? 'text-amber-400'
                            : 'text-indigo-400'
                        }`}
                      >
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-slate-200">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">Belum ada catatan log aktivitas server.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: QUICK SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Panduan Praktis Menghubungkan Kasir Multi-Client (1 Menit Selesai)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                      1
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Satu Jaringan WiFi / Router Toko
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Pastikan Laptop Kasir 1 (Master) dan Laptop Kasir 2 / HP terhubung ke nama WiFi (SSID) yang sama di toko Anda. <strong>Tidak memerlukan koneksi internet aktif</strong>, cukup router lokal standar.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                      2
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Buka Alamat IP di Kasir Lain
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Di Kasir 2 atau HP Owner, buka Chrome dan ketik alamat IP Host: <code className="text-indigo-600 font-mono text-[11px]">{localWifiUrl}</code> atau cukup scan QR Code yang ada di Tab Server Hub.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                      3
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Izin Windows Defender Firewall
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Jika kasir lain tidak bisa membuka alamat IP, pastikan Port 3000 tidak diblokir Windows Firewall. Klik &ldquo;Allow access&rdquo; saat jendela pop-up muncul di PC Server Kasir 1.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                      4
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Otomatis Deduksi Stok Real-Time
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ketika Kasir 2 melakukan transaksi penjualan, stok di Kasir 1 (Master) dan tablet gudang otomatis langsung terpotong seketika.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SOLUSI KASIR HP / WI-FI (TROUBLESHOOT) */}
          {activeTab === 'troubleshoot' && (
            <LANTroubleshootPanel
              serverStatus={serverStatus}
              config={config}
              publicCloudUrl={publicCloudUrl}
              effectiveHostIp={effectiveHostIp}
              localWifiUrl={localWifiUrl}
              onSaveCustomIp={(ip) => {
                handleSaveCustomIp(ip);
                setActiveTab('hub');
              }}
              onSelectAccessMode={(mode) => {
                setAccessMode(mode);
                setActiveTab('hub');
              }}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Mode:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {config.role === 'HOST' ? 'Server Master' : config.role === 'CLIENT' ? 'Terminal Kasir' : 'Mandiri'}
              </strong>
            </span>
          </div>

          <button
            id="btn-close-lan-modal-footer"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
