import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  KeyRound,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Lock,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Employee, EmployeeRole } from '../types';

export const EmployeeManagementModal: React.FC = () => {
  const {
    isEmployeeManagementOpen,
    setIsEmployeeManagementOpen,
    employees,
    activeEmployee,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    quickSwitchEmployee,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [role, setRole] = useState<EmployeeRole>('cashier');
  const [roleTitle, setRoleTitle] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [assignedShift, setAssignedShift] = useState('Shift Pagi (07:00 - 15:00)');
  const [isActive, setIsActive] = useState(true);
  const [avatarColor, setAvatarColor] = useState('bg-emerald-600');

  if (!isEmployeeManagementOpen) return null;

  const colorOptions = [
    { label: 'Emerald', value: 'bg-emerald-600' },
    { label: 'Teal', value: 'bg-teal-600' },
    { label: 'Blue', value: 'bg-blue-600' },
    { label: 'Indigo', value: 'bg-indigo-600' },
    { label: 'Purple', value: 'bg-purple-600' },
    { label: 'Amber', value: 'bg-amber-600' },
    { label: 'Rose', value: 'bg-rose-600' },
  ];

  const handleOpenAddForm = () => {
    setEditingEmployee(null);
    setName('');
    const nextNum = employees.length + 1;
    setEmployeeCode(`EMP-${nextNum < 10 ? '0' + nextNum : nextNum}`);
    setRole('cashier');
    setRoleTitle('Kasir Frontliner');
    setPin('');
    setPhone('');
    setEmail('');
    setAssignedShift('Shift Pagi (07:00 - 15:00)');
    setIsActive(true);
    setAvatarColor('bg-emerald-600');
    setActiveTab('form');
  };

  const handleOpenEditForm = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmployeeCode(emp.employeeCode);
    setRole(emp.role);
    setRoleTitle(emp.roleTitle || '');
    setPin(emp.pin);
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setAssignedShift(emp.assignedShift || 'Shift Pagi (07:00 - 15:00)');
    setIsActive(emp.isActive);
    setAvatarColor(emp.avatarColor);
    setActiveTab('form');
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase() || 'EM';
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNotification({ type: 'error', message: 'Nama karyawan wajib diisi.' });
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      setNotification({ type: 'error', message: 'PIN harus berupa minimal 4 digit angka.' });
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name,
        employeeCode,
        role,
        roleTitle: roleTitle || (role === 'cashier' ? 'Kasir Frontliner' : role === 'supervisor' ? 'Supervisor Toko' : role === 'inventory' ? 'Admin Gudang' : 'Owner'),
        pin,
        phone,
        email,
        assignedShift,
        isActive,
        avatar: getInitials(name),
        avatarColor,
      });
      setNotification({ type: 'success', message: `Data karyawan ${name} berhasil diperbarui.` });
    } else {
      addEmployee({
        employeeCode,
        name,
        role,
        roleTitle: roleTitle || (role === 'cashier' ? 'Kasir Frontliner' : role === 'supervisor' ? 'Supervisor Toko' : role === 'inventory' ? 'Admin Gudang' : 'Owner'),
        pin,
        phone,
        email,
        assignedShift,
        isActive,
        avatar: getInitials(name),
        avatarColor,
      });
      setNotification({ type: 'success', message: `Karyawan baru ${name} berhasil ditambahkan!` });
    }

    setTimeout(() => {
      setActiveTab('list');
      setNotification(null);
    }, 1000);
  };

  const handleDelete = (empId: string, empName: string) => {
    if (window.confirm(`Yakin ingin menghapus data karyawan ${empName}?`)) {
      const res = deleteEmployee(empId);
      if (res.success) {
        setNotification({ type: 'success', message: res.message });
      } else {
        setNotification({ type: 'error', message: res.message });
      }
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const getRoleBadge = (empRole: EmployeeRole) => {
    switch (empRole) {
      case 'owner':
        return { label: 'Owner / Pemilik', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'supervisor':
        return { label: 'Supervisor', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'inventory':
        return { label: 'Admin Gudang', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'cashier':
      default:
        return { label: 'Kasir', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  return (
    <div
      id="employee-management-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Kelola Karyawan & Hak Akses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manajemen akun kasir, admin gudang, supervisor, dan PIN login.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'list' ? (
              <button
                id="btn-add-employee-open"
                onClick={handleOpenAddForm}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" /> Tambah Karyawan
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('list')}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition"
              >
                Kembali ke Daftar
              </button>
            )}
            <button
              id="btn-close-employee-modal"
              onClick={() => setIsEmployeeManagementOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification banner */}
        {notification && (
          <div
            className={`px-6 py-2.5 flex items-center gap-2 text-xs font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-b border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Total Karyawan
                  </span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {employees.length} Orang
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    Karyawan Aktif
                  </span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {employees.filter((e) => e.isActive).length} Aktif
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-400">
                    Sedang Login
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    {activeEmployee ? activeEmployee.name : 'Tidak Ada'}
                  </div>
                </div>
              </div>

              {/* Employee Table / Cards */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5">Karyawan</th>
                      <th className="p-3.5">Jabatan / Role</th>
                      <th className="p-3.5">Shift Kerja</th>
                      <th className="p-3.5">PIN</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {employees.map((emp) => {
                      const badge = getRoleBadge(emp.role);
                      const isCurrent = activeEmployee?.id === emp.id;

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                            isCurrent ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl ${emp.avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0`}
                              >
                                {emp.avatar}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  {emp.name}
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-medium">
                                      Aktif
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {emp.employeeCode} {emp.phone && `• ${emp.phone}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {emp.roleTitle}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            {emp.assignedShift || 'Shift Normal'}
                          </td>
                          <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-bold">
                              •••• ({emp.pin})
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                emp.isActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  emp.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {emp.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1">
                            {!isCurrent && emp.isActive && (
                              <button
                                id={`btn-switch-emp-${emp.id}`}
                                onClick={() => quickSwitchEmployee(emp)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
                                title="Login sebagai karyawan ini"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              id={`btn-edit-emp-${emp.id}`}
                              onClick={() => handleOpenEditForm(emp)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition"
                              title="Edit Karyawan"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              id={`btn-del-emp-${emp.id}`}
                              onClick={() => handleDelete(emp.id, emp.name)}
                              disabled={isCurrent || employees.length <= 1}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Hapus Karyawan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Roles Explanation */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" /> Informasi Peran & Izin Sistem POS:
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                  <li>
                    <strong className="text-slate-700 dark:text-slate-300">Kasir:</strong> Melakukan transaksi kasir, input diskon/voucher, dan rekap shift kasir.
                  </li>
                  <li>
                    <strong className="text-slate-700 dark:text-slate-300">Admin Gudang:</strong> Mengelola stok, penerimaan barang supplier, dan retur supplier.
                  </li>
                  <li>
                    <strong className="text-slate-700 dark:text-slate-300">Supervisor:</strong> Otorisasi void transaksi, retur penjualan pelanggan, dan master produk.
                  </li>
                  <li>
                    <strong className="text-slate-700 dark:text-slate-300">Owner:</strong> Akses penuh laporan omzet laba rugi, pengaturan toko, dan kelola karyawan.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Add / Edit Employee Form */
            <form onSubmit={handleSubmitForm} className="space-y-4 max-w-xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap Karyawan *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="misal: Rian Pratama"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Karyawan *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="misal: EMP-06"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan / Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as EmployeeRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="cashier">Kasir (Frontliner)</option>
                    <option value="inventory">Admin Gudang & Stok</option>
                    <option value="supervisor">Supervisor / Kepala Toko</option>
                    <option value="owner">Pemilik Toko (Owner)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Judul Posisi (Kustom)
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="misal: Kasir Utama Shift Pagi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PIN Keamanan (4-6 Digit) *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="misal: 1234"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono tracking-widest"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    PIN ini digunakan karyawan untuk membuka layar kasir.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shift Kerja Ditugaskan
                  </label>
                  <select
                    value={assignedShift}
                    onChange={(e) => setAssignedShift(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Shift Pagi (07:00 - 15:00)">Shift Pagi (07:00 - 15:00)</option>
                    <option value="Shift Siang (14:30 - 22:30)">Shift Siang (14:30 - 22:30)</option>
                    <option value="Shift Malam (22:00 - 06:00)">Shift Malam (22:00 - 06:00)</option>
                    <option value="Full Day & Supervisory">Full Day & Supervisory</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Karyawan
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@ulilmart.co.id"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* Avatar Color Picker & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Warna Avatar Profil
                  </label>
                  <div className="flex items-center gap-2">
                    {colorOptions.map((c) => (
                      <button
                        type="button"
                        key={c.value}
                        onClick={() => setAvatarColor(c.value)}
                        className={`w-7 h-7 rounded-xl ${c.value} transition ${
                          avatarColor === c.value
                            ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Status Akun
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Karyawan Aktif (Dapat login ke POS)
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-save-employee"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {editingEmployee ? 'Simpan Perubahan' : 'Tambah Karyawan'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
