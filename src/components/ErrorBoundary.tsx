import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    if (window.confirm('Reset data lokal dan muat ulang aplikasi? Data transaksi tersimpan di server tidak akan terhapus.')) {
      try {
        localStorage.removeItem('pos_retail_products_v3');
        localStorage.removeItem('pos_active_cart');
        localStorage.removeItem('pos_held_orders');
        localStorage.removeItem('pos_lan_config');
      } catch (e) {
        console.warn('Gagal membersihkan cache:', e);
      }
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Terjadi Kendala Tampilan</h1>
                <p className="text-xs text-slate-400">Aplikasi POS mendeteksi error tak terduga.</p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-rose-300 font-mono overflow-auto max-h-36 mb-5">
              {this.state.error?.message || 'Unknown render error'}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                id="btn-error-boundary-reload"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
                id="btn-error-boundary-reset"
                onClick={this.handleResetCache}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Bersihkan Cache Lokal</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
