import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Wifi,
  Globe,
  ShieldAlert,
  Smartphone,
  Laptop,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';
import { LANServerStatus, LANConfig } from '../types';
import { testLANConnection } from '../utils/lanSyncManager';

interface LANTroubleshootPanelProps {
  serverStatus: LANServerStatus | null;
  config: LANConfig;
  publicCloudUrl: string;
  effectiveHostIp: string;
  localWifiUrl: string;
  onSaveCustomIp: (ip: string) => void;
  onSelectAccessMode: (mode: 'wifi_lan' | 'cloud') => void;
}

export const LANTroubleshootPanel: React.FC<LANTroubleshootPanelProps> = ({
  serverStatus,
  config,
  publicCloudUrl,
  effectiveHostIp,
  localWifiUrl,
  onSaveCustomIp,
  onSelectAccessMode,
}) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [customIp, setCustomIp] = useState(effectiveHostIp || '');
  const [expandedCard, setExpandedCard] = useState<string | null>('issue_localhost');

  // Ping test state
  const [testUrl, setTestUrl] = useState(localWifiUrl || publicCloudUrl);
  const [isPinging, setIsPinging] = useState(false);
  const [pingTestResult, setPingTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs: number;
    error?: string;
  } | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 3000);
  };

  const handleRunPingTest = async () => {
    if (!testUrl.trim()) return;
    setIsPinging(true);
    setPingTestResult(null);
    const res = await testLANConnection(testUrl.trim());
    setPingTestResult({
      tested: true,
      success: res.success,
      latencyMs: res.latencyMs,
      error: res.error,
    });
    setIsPinging(false);
  };

  const toggleCard = (id: string) => {
    setExpandedCard((prev) => (prev === id ? null : id));
  };

  const FIREWALL_CMD = `netsh advfirewall firewall add rule name="POS Kasir Port 3000" dir=in action=allow protocol=TCP localport=3000`;

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Pusat Diagnosa: Mengapa HP / Kasir Lain Tidak Bisa Membuka Aplikasi?
          </h3>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
            Hampir 99% masalah gagal terhubung dari HP disebabkan oleh salah satu dari 3 hal: <strong>mengetik 'localhost' di browser HP</strong>, <strong>Firewall Windows memblokir Port 3000</strong>, atau <strong>HP tidak dalam 1 Wi-Fi yang sama</strong>. Ikuti panduan instan di bawah:
          </p>
        </div>
      </div>

      {/* Quick Direct Ping Tester */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Uji Coba Ping Sambungan URL Kasir
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">Verifikasi apakah URL merespons secara real-time</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="http://192.168.1.15:3000 atau https://..."
            className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
          />
          <button
            id="btn-run-troubleshoot-ping"
            onClick={handleRunPingTest}
            disabled={isPinging}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Menguji...' : 'Uji Koneksi Sekarang'}</span>
          </button>
        </div>

        {pingTestResult && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 ${
              pingTestResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {pingTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>
                {pingTestResult.success
                  ? `Koneksi Berhasil! Latensi: ${pingTestResult.latencyMs} ms. Server POS aktif merespons.`
                  : `Gagal terhubung: ${pingTestResult.error || 'Server tidak merespons.'}`}
              </span>
            </div>
            {pingTestResult.success && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                Online
              </span>
            )}
          </div>
        )}
      </div>

      {/* Troubleshooting Accordions */}
      <div className="space-y-3">
        {/* CARD 1: Penyebab #1 Localhost di HP */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
          <button
            onClick={() => toggleCard('issue_localhost')}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Jangan Ketik &ldquo;localhost&rdquo; atau &ldquo;127.0.0.1&rdquo; di Browser HP!</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    Penyebab Paling Sering
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Kenapa HP menampilkan &ldquo;Situs ini tidak dapat dijangkau / ERR_CONNECTION_REFUSED&rdquo;?
                </p>
              </div>
            </div>
            {expandedCard === 'issue_localhost' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCard === 'issue_localhost' && (
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 text-xs">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Kata <strong>&ldquo;localhost&rdquo;</strong> di dalam bahasa jaringan komputer berarti <em>&ldquo;perangkat saya saat ini&rdquo;</em>. Jika Anda mengetik <code>http://localhost:3000</code> di HP, HP akan mencari server di dalam HP itu sendiri, bukan di komputer kasir!
              </p>

              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Solusi Benar: Gunakan IP Wi-Fi PC Kasir</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Di browser HP, Anda harus mengetikkan IP Wi-Fi komputer kasir, contohnya: <strong>http://192.168.1.15:3000</strong>.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="Contoh: 192.168.1.15"
                    className="px-2.5 py-1.5 text-xs font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    onClick={() => {
                      onSaveCustomIp(customIp);
                      onSelectAccessMode('wifi_lan');
                    }}
                    className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Simpan IP &amp; Buat QR Code
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: Firewall Windows Memblokir Port 3000 */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
          <button
            onClick={() => toggleCard('issue_firewall')}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>HP Loading Terus Lalu Timeout? (Windows Firewall Memblokir Port 3000)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Di Windows, port 3000 diblokir secara bawaan untuk koneksi dari luar
                </p>
              </div>
            </div>
            {expandedCard === 'issue_firewall' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCard === 'issue_firewall' && (
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 text-xs">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Jika Anda sudah mengetikkan IP yang benar (misal <code>192.168.1.15:3000</code>), namun browser di HP berputar terus dan akhirnya <em>Connection Timed Out</em>, berarti <strong>Windows Firewall di PC Kasir menolak sambungan HP</strong>.
              </p>

              <div className="p-3.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    Jalankan Perintah Ini di CMD / PowerShell (Administrator):
                  </span>
                  <button
                    onClick={() => handleCopy(FIREWALL_CMD, 'firewall')}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedItem === 'firewall' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedItem === 'firewall' ? 'Tersalin!' : 'Salin Perintah'}</span>
                  </button>
                </div>
                <div className="p-2 rounded bg-black/40 text-emerald-400 select-all break-all">
                  {FIREWALL_CMD}
                </div>
              </div>

              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>Klik tombol <strong>Start</strong> di Windows &rarr; ketik <code>cmd</code>.</li>
                <li>Klik kanan pada <strong>Command Prompt</strong> &rarr; pilih <strong>Run as Administrator</strong>.</li>
                <li>Klik kanan / Paste perintah di atas &rarr; tekan <strong>Enter</strong>. Port 3000 langsung terbuka seketika!</li>
              </ol>
            </div>
          )}
        </div>

        {/* CARD 3: HP Terhubung ke Paket Data / 4G bukan Wi-Fi */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
          <button
            onClick={() => toggleCard('issue_wifi')}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Pastikan HP Terhubung ke Nama Wi-Fi (SSID) yang Sama dengan PC Kasir</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Jangan gunakan Kuota Data Seluler (4G/5G) saat mengakses alamat IP lokal
                </p>
              </div>
            </div>
            {expandedCard === 'issue_wifi' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCard === 'issue_wifi' && (
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 text-xs">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Jaringan lokal (IP 192.168.x.x) hanya ada di dalam router Wi-Fi toko Anda. Jika HP Anda menggunakan data Telkomsel / Indosat / XL, HP berada di internet publik dan tidak bisa melihat komputer kasir Anda.
              </p>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-[11px]">
                <Wifi className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Trik: Matikan Data Seluler di HP &rarr; Sambungkan ke Wi-Fi Toko &rarr; Buka browser Chrome di HP.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* CARD 4: Solusi Paling Instan - Gunakan Link Cloud Publik */}
        <div className="border border-indigo-200 dark:border-indigo-800/80 rounded-xl bg-gradient-to-r from-indigo-50/50 via-white to-blue-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-blue-950/20 overflow-hidden">
          <button
            onClick={() => toggleCard('issue_cloud')}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <span>Solusi Termudah: Buka Lewat Link Cloud (Bisa dari HP Mana Saja Tanpa Wi-Fi)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Rekomendasi Instan
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Bebas dari masalah IP, tanpa setting firewall, langsung jalan di HP apapun
                </p>
              </div>
            </div>
            {expandedCard === 'issue_cloud' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCard === 'issue_cloud' && (
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-indigo-100 dark:border-indigo-900/40 bg-white/70 dark:bg-slate-950/50 text-xs">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Jika Anda sedang menguji aplikasi melalui <strong>Google AI Studio / Cloud Run</strong>, Anda dapat langsung membagikan Link Cloud Publik ke handphone kasir atau scan QR Code tanpa perlu repot konfigurasi IP lokal:
              </p>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300 select-all break-all">
                  {publicCloudUrl}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(publicCloudUrl, 'cloud_url')}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedItem === 'cloud_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedItem === 'cloud_url' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                  <a
                    href={publicCloudUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    title="Buka di Tab Baru"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Tip: Klik tab <strong>&ldquo;Server Hub &amp; Pengaturan&rdquo;</strong> di atas, pilih opsi <strong>&ldquo;Akses Online / Cloud&rdquo;</strong>, lalu scan QR Code dengan kamera smartphone Anda!
              </div>
            </div>
          )}
        </div>

        {/* CARD 5: Cara Cek IP PC Kasir di Windows */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
          <button
            onClick={() => toggleCard('issue_find_ip')}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Cara Mengetahui Alamat IP Wi-Fi Komputer PC Kasir (Windows &amp; Mac)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Langkah sederhana 15 detik untuk melihat angka IP lokal
                </p>
              </div>
            </div>
            {expandedCard === 'issue_find_ip' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCard === 'issue_find_ip' && (
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Di Komputer Windows 10 / 11:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                    <li>Tekan tombol <strong>Windows + R</strong> di keyboard.</li>
                    <li>Ketik <code>cmd</code> lalu tekan Enter.</li>
                    <li>Ketik <code>ipconfig</code> lalu tekan Enter.</li>
                    <li>Cari baris <strong>IPv4 Address</strong> (contoh: <code>192.168.1.50</code>).</li>
                  </ol>
                </div>

                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-blue-500" />
                    <span>Di Komputer macOS / Apple:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                    <li>Buka <strong>System Settings</strong> &rarr; pilih <strong>Wi-Fi</strong>.</li>
                    <li>Klik tombol <strong>Details...</strong> pada Wi-Fi yang aktif.</li>
                    <li>Lihat baris <strong>IP Address</strong> (contoh: <code>192.168.1.102</code>).</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
