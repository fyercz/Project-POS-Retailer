/**
 * Validasi ubah data member (murni, teruji). Dulu data member tidak bisa diubah dari tampilan.
 * Nomor HP harus unik karena dipakai untuk mencari member di kasir.
 */
export interface CustomerEditInput {
  name: string;
  phone: string;
  email?: string;
  tier?: string;
}

const digits = (s: string) => (s || '').replace(/\D/g, '');

export function validateCustomerEdit(
  id: string,
  input: CustomerEditInput,
  others: Array<{ id: string; phone?: string }>
): { ok: true; updates: { name: string; phone: string; email?: string; tier?: string } } | { ok: false; message: string } {
  const name = (input.name || '').replace(/\s+/g, ' ').trim();
  if (name.length < 2) return { ok: false, message: 'Nama minimal 2 huruf.' };
  const phone = (input.phone || '').trim();
  const d = digits(phone);
  if (d.length < 8 || d.length > 15) return { ok: false, message: 'Nomor HP harus 8-15 digit.' };
  if (others.some((o) => o.id !== id && digits(o.phone || '') === d)) return { ok: false, message: 'Nomor HP sudah dipakai member lain.' };
  const email = (input.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'Format email tidak valid.' };
  return { ok: true, updates: { name, phone, email: email || undefined, ...(input.tier ? { tier: input.tier } : {}) } };
}
