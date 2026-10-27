import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  CreditCard,
  Tag,
  FileText,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Supplier } from '../types';
import { usePOS } from '../context/POSContext';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
  onSuccess?: (supplier: Supplier, isEdit: boolean) => void;
}

const PAYMENT_TERMS_OPTIONS = [
  'Tunai / Cash',
  'Tempo 7 Hari',
  'Tempo 14 Hari',
  'Tempo 30 Hari',
  'Tempo 45 Hari',
  'Tempo 60 Hari',
  'Konsinyasi / Titip Jual',
];

const CATEGORY_PRESETS = [
  'Sembako & Bahan Pokok',
  'Makanan Instan & Bumbu',
  'Minuman & Susu',
  'Snack, Biskuit & Permen',
  'Perawatan Tubuh & Kosmetik',
  'Kebersihan Rumah & Deterjen',
  'Frozen Food & Produk Dingin',
  'Distributor Grosir Campuran (General)',
];

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSuccess,
}) => {
  const { addSupplier, updateSupplier } = usePOS();
  const isEditMode = Boolean(supplierToEdit);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(PAYMENT_TERMS_OPTIONS[0]);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || '');
      setContactPerson(supplierToEdit.contactPerson || '');
      setPhone(supplierToEdit.phone || '');
      setEmail(supplierToEdit.email || '');
      setAddress(supplierToEdit.address || '');
      setCategory(supplierToEdit.category || '');
      setPaymentTerms(supplierToEdit.paymentTerms || PAYMENT_TERMS_OPTIONS[0]);
      setLeadTimeDays(supplierToEdit.leadTimeDays || 0);
      setIsActive(supplierToEdit.isActive !== false);
      setNotes(supplierToEdit.notes || '');
    } else {
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      // Mitra baru: kategori & lama pengiriman dikosongkan (dulu otomatis 'Sembako' dan 2 hari)
      setCategory('');
      setPaymentTerms(PAYMENT_TERMS_OPTIONS[0]);
      setLeadTimeDays(0);
      setIsActive(true);
      setNotes('');
    }
    setErrors({});
  }, [supplierToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Nama supplier / perusahaan distributor wajib diisi';
    // Nomor telepon dan WhatsApp sekarang opsional
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const supplierPayload: Omit<Supplier, 'id' | 'createdAt'> = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      category: category.trim() || undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      leadTimeDays: Number(leadTimeDays) > 0 ? Number(leadTimeDays) : undefined,
      isActive,
      notes: notes.trim() || undefined,
    };

    if (isEditMode && supplierToEdit) {
      updateSupplier(supplierToEdit.id, supplierPayload);
      if (onSuccess) {
        onSuccess(
          {
            ...supplierPayload,
            id: supplierToEdit.id,
            createdAt: supplierToEdit.createdAt,
          },
          true
        );
      }
    } else {
      const created = addSupplier(supplierPayload);
      if (onSuccess) {
        onSuccess(created, false);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isEditMode ? 'Edit Data Supplier & Distributor' : 'Tambah Supplier Baru'}</span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  {isEditMode ? 'Perbarui Data' : 'Pemasok Baru'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditMode
                  ? `Mengubah rincian kontak dan profil pemasok: ${supplierToEdit?.name}`
                  : 'Daftarkan mitra distributor/pemasok barang untuk pencatatan faktur & retur'}
              </p>
            </div>
          </div>
          <button aria-label="Tutup"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Perusahaan / Supplier / Distributor <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'err-supplierformmodal-name' : undefined} aria-label="Nama Perusahaan / Supplier / Distributor"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: PT Indomarco Adi Prima, CV Sumber Berkah..."
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                  errors.name ? 'border-rose-500 bg-rose-50/20' : 'border-slate-500 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none`}
              />
            </div>
            {errors.name && <p id="err-supplierformmodal-name" role="alert" className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Kontak / Sales Representative (PIC)
              </label>
              <input aria-label="Nama Kontak / Sales Representative (PIC)"
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Contoh: Budi Santoso (Sales)"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Telepon / WhatsApp <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input aria-label="Nomor Telepon / WhatsApp (Opsional)"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-3456-7890 atau 021-55667788 (Opsional)"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Email & Kategori */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Kontak (Opsional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input aria-label="Email Kontak (Opsional)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="order@distributor.co.id"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori Pasokan Produk
              </label>
              <select aria-label="Kategori Pasokan Produk"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- Pilih kategori (opsional) --</option>
                {CATEGORY_PRESETS.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Terms & Lead Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Termin Pembayaran Default
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select aria-label="Termin Pembayaran Default"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  {PAYMENT_TERMS_OPTIONS.map((term, idx) => (
                    <option key={idx} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lead Time (Hari Kirim)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input aria-label="Lead Time (Hari Kirim)"
                  type="number"
                  min={1}
                  max={60}
                  value={leadTimeDays || ''}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                  placeholder="Opsional"
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Kantor / Gudang Distribusi
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <textarea aria-label="Alamat Kantor / Gudang Distribusi"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Kawasan Industri Pulogadung Blok B No. 12, Jakarta Timur..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Ketentuan Khusus
            </label>
            <textarea aria-label="Catatan / Ketentuan Khusus"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jadwal pengiriman rutin, minimal order pembelian, kebijakan retur barang rusak..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Active Switch */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Supplier Aktif (Dapat dipilih saat input faktur pembelian & retur)
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isEditMode ? 'Simpan Perubahan' : 'Simpan Data Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
