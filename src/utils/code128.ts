/**
 * Barcode Code 128-B yang benar-benar bisa dipindai (pengganti garis hiasan "Simulated Thermal
 * Barcode" di struk). Tabel pola diambil dari pustaka python-barcode; diuji terhadap keluarannya.
 * Mengembalikan pola modul: '1' = garis hitam, '0' = celah (termasuk start, checksum, stop).
 */
const PATTERNS: readonly string[] = ['11011001100', '11001101100', '11001100110', '10010011000', '10010001100', '10001001100', '10011001000', '10011000100', '10001100100', '11001001000', '11001000100', '11000100100', '10110011100', '10011011100', '10011001110', '10111001100', '10011101100', '10011100110', '11001110010', '11001011100', '11001001110', '11011100100', '11001110100', '11101101110', '11101001100', '11100101100', '11100100110', '11101100100', '11100110100', '11100110010', '11011011000', '11011000110', '11000110110', '10100011000', '10001011000', '10001000110', '10110001000', '10001101000', '10001100010', '11010001000', '11000101000', '11000100010', '10110111000', '10110001110', '10001101110', '10111011000', '10111000110', '10001110110', '11101110110', '11010001110', '11000101110', '11011101000', '11011100010', '11011101110', '11101011000', '11101000110', '11100010110', '11101101000', '11101100010', '11100011010', '11101111010', '11001000010', '11110001010', '10100110000', '10100001100', '10010110000', '10010000110', '10000101100', '10000100110', '10110010000', '10110000100', '10011010000', '10011000010', '10000110100', '10000110010', '11000010010', '11001010000', '11110111010', '11000010100', '10001111010', '10100111100', '10010111100', '10010011110', '10111100100', '10011110100', '10011110010', '11110100100', '11110010100', '11110010010', '11011011110', '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', '10111101000', '10111100010', '11110101000', '11110100010', '10111011110', '10111101110', '11101011110', '11110101110', '11010000100', '11010010000', '11010011100'];
const START_B = 104;
const STOP = '1100011101011'; // pola stop + garis penutup 2 modul

export function code128B(text: string): string {
  const values: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error(`Karakter tidak didukung Code 128-B: ${JSON.stringify(ch)}`);
    values.push(code - 32);
  }
  let sum = START_B;
  values.forEach((v, i) => (sum += v * (i + 1)));
  const check = sum % 103;
  return PATTERNS[START_B] + values.map((v) => PATTERNS[v]).join('') + PATTERNS[check] + STOP;
}

const START_C = 105;
const CODE_B = 100; // pindah ke mode B (dari mode C)
const CODE_C = 99; // pindah ke mode C (dari mode B)

/**
 * Code 128 dengan mode C otomatis untuk deret angka (2 angka per simbol): lebih ringkas sehingga
 * garis lebih lebar & tetap terbaca di kertas 58 mm (printer 203 dpi). Deret angka >= 4 di awal/akhir
 * atau >= 6 di tengah dikodekan dalam mode C.
 */
export function code128(text: string): string {
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) throw new Error(`Karakter tidak didukung Code 128: ${JSON.stringify(ch)}`);
  }
  const digitRun = (i: number) => {
    let j = i;
    while (j < text.length && text[j]! >= '0' && text[j]! <= '9') j++;
    return j - i;
  };
  const values: number[] = [];
  let i = 0;
  let mode: 'B' | 'C';
  const firstRun = digitRun(0);
  if (firstRun >= 4) {
    mode = 'C';
    values.push(START_C);
  } else {
    mode = 'B';
    values.push(START_B);
  }
  while (i < text.length) {
    const run = digitRun(i);
    if (mode === 'C') {
      if (run >= 2) {
        values.push(Number(text.slice(i, i + 2)));
        i += 2;
        continue;
      }
      values.push(CODE_B);
      mode = 'B';
      continue;
    }
    const atEnd = i + run === text.length;
    if (run >= 6 || (atEnd && run >= 4)) {
      if (run % 2 === 1) {
        values.push(text.charCodeAt(i) - 32); // angka ganjil pertama tetap di mode B
        i++;
      }
      values.push(CODE_C);
      mode = 'C';
      continue;
    }
    values.push(text.charCodeAt(i) - 32);
    i++;
  }
  let sum = values[0]!;
  for (let k = 1; k < values.length; k++) sum += values[k]! * k;
  return values.map((v) => PATTERNS[v]).join('') + PATTERNS[sum % 103] + STOP;
}

/** Isi barcode struk: nomor nota tanpa awalan "INV-" & tanda hubung (lebih ringkas). */
export function receiptBarcodeValue(invoiceNumber: string): string {
  return invoiceNumber.replace(/^INV-/i, '').replace(/-/g, '');
}
