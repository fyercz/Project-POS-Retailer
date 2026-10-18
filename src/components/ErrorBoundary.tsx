import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

/**
 * Penangkap error tampilan.
 * - variant "page" (default, di main.tsx): jaring pengaman terakhir untuk seluruh aplikasi.
 * - variant "section": membungkus satu halaman/jendela. Bila bagian itu error, hanya bagian itu
 *   yang menampilkan pesan; header, keranjang, dan bagian lain tetap berjalan.
 * resetKeys: bila nilainya berubah (mis. pindah halaman), error otomatis dibersihkan.
 * Tidak ada tombol penghapus data (data utama tersimpan di IndexedDB & server).
 */
interface Props {
  children: ReactNode;
  variant?: 'page' | 'section';
  label?: string;
  resetKeys?: unknown[];
  onClose?: () => void;
  /** Pesan error mengambang di pojok layar (untuk jendela modal & komponen global) */
  floating?: boolean;
}

interface State {
  error: Error | null;
  dismissed?: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, errorInfo.componentStack);
  }

  override componentDidUpdate(prev: Props) {
    if (!this.state.error) return;
    const a = prev.resetKeys || [];
    const b = this.props.resetKeys || [];
    if (a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]))) this.setState({ error: null });
  }

  private retry = () => this.setState({ error: null, dismissed: false });

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const message = error.message || String(error);

    if (this.props.variant === 'section') {
      if (this.state.dismissed) return null;
      return (
        <div
          role="alert"
          className={`${this.props.floating ? 'fixed bottom-4 right-4 z-[400] max-w-md shadow-xl' : 'm-4'} p-4 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 text-sm space-y-2`}
        >
          <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4" />
            {this.props.label ? `Bagian "${this.props.label}" mengalami error` : 'Bagian ini mengalami error'}
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Bagian lain aplikasi tetap bisa dipakai. Detail: <span className="font-mono">{message}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.retry}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Coba lagi
            </button>
            {(this.props.onClose || this.props.floating) && (
              <button
                type="button"
                onClick={() => {
                  if (this.props.onClose) {
                    this.retry();
                    this.props.onClose();
                  } else this.setState({ dismissed: true });
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div role="alert" className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-600" /> Aplikasi kasir mengalami error
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Data transaksi dan produk tetap aman (tersimpan di perangkat & server). Muat ulang untuk melanjutkan.
            Bila terus berulang, kirim pesan di bawah ini ke pengelola aplikasi.
          </p>
          <pre className="text-xs font-mono p-3 rounded-xl bg-slate-100 dark:bg-slate-950 overflow-x-auto whitespace-pre-wrap">{message}</pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Muat ulang
          </button>
        </div>
      </div>
    );
  }
}
