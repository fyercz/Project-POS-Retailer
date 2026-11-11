import React, { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Button, Field, ModalShell, StatusText, inputClass } from './ui';
import { CASH_KIND_LABELS, OTHER_INCOME_LABELS, summarizeCashBook, type CashEntryKind, type OtherIncomeCategory } from '../domain/cashBook';
import { formatCurrency } from '../utils/formatters';

/**
 * Buku Kas Toko: catatan kas di luar penjualan, mengikuti laporan kas manual toko
 * (LAP.HARI / PPOB / LABA): kas masuk lain-lain, penarikan kas pemilik, dan PPOB per shift.
 */
type Tab = 'income' | 'withdrawal' | 'ppob';

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const CashBookModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { cashEntries, addCashEntry, deleteCashEntry, suppliers, settings, activeEmployee } = usePOS();
  const isManager = !!activeEmployee && ['owner', 'supervisor'].includes(activeEmployee.role);
  const [tab, setTab] = useState<Tab>('income');
  const [category, setCategory] = useState<OtherIncomeCategory>('sewa_rak');
  const [ppobKind, setPpobKind] = useState<'ppob_sale' | 'ppob_topup'>('ppob_sale');
  const [shiftLabel, setShiftLabel] = useState('Sift 1');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayYmd());
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const monthStart = useMemo(() => {
    const d = new Date(date || todayYmd());
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, [date]);
  const monthEnd = useMemo(() => {
    const d = new Date(monthStart);
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1;
  }, [monthStart]);
  const kindsOfTab: CashEntryKind[] = tab === 'income' ? ['income'] : tab === 'withdrawal' ? ['withdrawal'] : ['ppob_sale', 'ppob_topup'];
  const rows = (cashEntries || [])
    .filter((c) => kindsOfTab.includes(c.kind) && new Date(c.date).getTime() >= monthStart && new Date(c.date).getTime() <= monthEnd)
    .sort((a, b) => b.date.localeCompare(a.date));
  const summary = summarizeCashBook(cashEntries || [], monthStart, monthEnd);
  const monthLabel = new Date(monthStart).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  if (!isOpen) return null;

  const save = () => {
    const kind: CashEntryKind = tab === 'income' ? 'income' : tab === 'withdrawal' ? 'withdrawal' : ppobKind;
    const r = addCashEntry({
      kind,
      category: tab === 'income' ? category : undefined,
      counterparty: tab === 'income' ? counterparty : undefined,
      shiftLabel: tab === 'ppob' ? shiftLabel : undefined,
      amount: Number(amount),
      date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
      description,
    });
    setMessage({ tone: r.success ? 'success' : 'danger', text: r.message });
    if (r.success) {
      setAmount('');
      setDescription('');
      setCounterparty('');
    }
  };

  const tabButton = (t: Tab, label: string) => (
    <button
      key={t}
      type="button"
      aria-pressed={tab === t}
      onClick={() => {
        setTab(t);
        setMessage(null);
      }}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
        tab === t ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );

  const outflowLocked = !isManager && (tab === 'withdrawal' || (tab === 'ppob' && ppobKind === 'ppob_topup'));

  return (
    <ModalShell
      title="Buku Kas Toko"
      icon={<Wallet className="w-5 h-5 text-emerald-700" />}
      onClose={onClose}
      size="lg"
      description="Kas di luar penjualan, seperti buku kas harian toko: sewa rak, sewa tempat, jual kardus, laba PPOB, penarikan kas pemilik, dan PPOB per shift."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {tabButton('income', 'Kas Masuk Lain-lain')}
        {tabButton('withdrawal', 'Penarikan Kas')}
        {tabButton('ppob', 'PPOB')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tab === 'income' && (
          <>
            <Field label="Jenis kas masuk">
              <select value={category} onChange={(e) => setCategory(e.target.value as OtherIncomeCategory)} className={inputClass}>
                {(Object.keys(OTHER_INCOME_LABELS) as OtherIncomeCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {OTHER_INCOME_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dari (opsional)" hint={category === 'sewa_rak' ? 'Nama supplier penyewa rak' : undefined}>
              <input list="cashbook-suppliers" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="Mis. T ALAN" className={inputClass} />
            </Field>
            <datalist id="cashbook-suppliers">
              {(suppliers || []).map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </>
        )}
        {tab === 'ppob' && (
          <>
            <Field label="Jenis catatan PPOB">
              <select value={ppobKind} onChange={(e) => setPpobKind(e.target.value as 'ppob_sale' | 'ppob_topup')} className={inputClass}>
                <option value="ppob_sale">Penjualan PPOB (uang masuk)</option>
                <option value="ppob_topup">Isi Saldo PPOB (uang keluar)</option>
              </select>
            </Field>
            <Field label="Shift">
              <select value={shiftLabel} onChange={(e) => setShiftLabel(e.target.value)} className={inputClass}>
                <option value="Sift 1">Sift 1 (pagi)</option>
                <option value="Sift 2">Sift 2 (sore)</option>
              </select>
            </Field>
          </>
        )}
        <Field label="Nominal (Rp)">
          <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Tanggal">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Keterangan (opsional)">
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kosongkan untuk uraian otomatis" className={inputClass} />
          </Field>
        </div>
      </div>

      {outflowLocked && <StatusText tone="warning">Hanya Owner/Supervisor yang boleh mencatat uang keluar.</StatusText>}
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={save} disabled={outflowLocked || !(Number(amount) > 0)}>
          Simpan Catatan
        </Button>
        {message && <StatusText tone={message.tone}>{message.text}</StatusText>}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-xs">
          <strong className="text-slate-800 dark:text-slate-100">{CASH_KIND_LABELS[kindsOfTab[0]!]} — {monthLabel}</strong>
          <span className="font-mono text-slate-700 dark:text-slate-200">
            {tab === 'income' && `Total ${formatCurrency(summary.otherIncome, settings.currency)}`}
            {tab === 'withdrawal' && `Total ${formatCurrency(summary.withdrawals, settings.currency)}`}
            {tab === 'ppob' && `Penjualan ${formatCurrency(summary.ppobSales, settings.currency)} · Isi saldo ${formatCurrency(summary.ppobTopups, settings.currency)}`}
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada catatan bulan ini.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((c) => (
              <li key={c.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0">
                  <span className="text-slate-500">{new Date(c.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>{' '}
                  <span className="text-slate-800 dark:text-slate-100">
                    {c.kind === 'ppob_topup' ? 'Isi saldo PPOB' : c.kind === 'ppob_sale' ? `Penjualan PPOB ${c.shiftLabel || ''}` : c.description}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-mono">{formatCurrency(c.amount, settings.currency)}</span>
                  {isManager && (
                    <Button variant="ghost" size="sm" aria-label={`Hapus catatan ${c.description}`} onClick={() => confirm(`Hapus catatan "${c.description}"?`) && deleteCashEntry(c.id)}>
                      Hapus
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalShell>
  );
};
