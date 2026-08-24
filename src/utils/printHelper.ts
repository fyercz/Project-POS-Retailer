/**
 * Print & Export Utilities for POS Reports & Receipts
 * Provides iframe-safe printing, thermal & standard layouts, and CSV export.
 */

export interface PrintDocumentOptions {
  title: string;
  contentHtml: string;
  styles?: string;
  paperType?: 'a4' | 'f4' | '80mm' | '58mm';
}

/**
 * Robust printing using a hidden iframe to ensure compatibility with
 * embedded iframes, modals, and physical thermal or desktop printers.
 */
export const printViaIframe = (contentHtml: string, title: string = 'Laporan POS', paperType: 'a4' | 'f4' | '80mm' | '58mm' = 'a4') => {
  // Remove existing print iframe if any
  const existingFrame = document.getElementById('pos-print-hidden-frame');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-print-hidden-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    // Fallback to standard window.print if iframe fails
    window.print();
    return;
  }

  const isThermal = paperType === '58mm' || paperType === '80mm';
  const pageSizeRule = paperType === '58mm' 
    ? '58mm auto' 
    : paperType === '80mm' 
    ? '80mm auto' 
    : paperType === 'f4' 
    ? '215mm 330mm portrait' 
    : '210mm 297mm portrait';

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: ${pageSizeRule};
            margin: ${isThermal ? '2mm' : '8mm 10mm'};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: ${isThermal ? '10px' : '12px'};
            line-height: ${isThermal ? '1.3' : '1.5'};
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: ${isThermal ? '4px' : '0'};
          }
          h1, h2, h3, h4 {
            margin: 0;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          th, td {
            padding: ${isThermal ? '3px 2px' : '6px 8px'};
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background-color: #f8fafc;
            font-weight: 600;
            color: #334155;
            font-size: ${isThermal ? '9px' : '11px'};
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .text-emerald { color: #059669; }
          .text-slate-500 { color: #64748b; }
          .text-slate-700 { color: #334155; }
          .bg-slate-50 { background-color: #f8fafc; }
          .border-dashed { border-style: dashed; }
          .border-t { border-top: 1px solid #cbd5e1; }
          .border-b { border-bottom: 1px solid #cbd5e1; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .py-2 { padding-top: 8px; padding-bottom: 8px; }
          .my-2 { margin-top: 8px; margin-bottom: 8px; }
          .my-4 { margin-top: 16px; margin-bottom: 16px; }
          .grid-2 { display: flex; justify-content: space-between; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
          }
          .badge-success { background: #d1fae5; color: #065f46; }
          .badge-info { background: #e0f2fe; color: #0369a1; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .footer-sign {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sign-box {
            text-align: center;
            width: 180px;
          }
          .sign-line {
            margin-top: 50px;
            border-bottom: 1px solid #64748b;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
    </html>
  `;

  doc.open();
  doc.write(fullHtml);
  doc.close();

  // Give resources time to load then trigger print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print', err);
      window.print();
    }
  }, 300);
};

/**
 * Opens report in a dedicated printable popup window
 */
export const openPrintWindow = (contentHtml: string, title: string = 'Laporan POS', paperType: 'a4' | 'f4' | '80mm' | '58mm' = 'a4') => {
  const isThermal = paperType === '58mm' || paperType === '80mm';
  const width = isThermal ? 420 : 850;
  const height = 750;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  const printWindow = window.open(
    '',
    '_blank',
    `width=${width},height=${height},left=${left},top=${top},toolbar=0,scrollbars=1,status=0,resizable=1`
  );

  if (!printWindow) {
    // If popup is blocked, use iframe print
    printViaIframe(contentHtml, title, paperType);
    return;
  }

  const pageSizeRule = paperType === '58mm' 
    ? '58mm auto' 
    : paperType === '80mm' 
    ? '80mm auto' 
    : paperType === 'f4' 
    ? '215mm 330mm portrait' 
    : '210mm 297mm portrait';

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: ${pageSizeRule};
            margin: ${isThermal ? '3mm' : '8mm 10mm'};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: ${isThermal ? '10px' : '12px'};
            line-height: ${isThermal ? '1.3' : '1.5'};
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: ${isThermal ? '8px' : '20px'};
          }
          .toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #1e293b;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 1000;
          }
          .toolbar button {
            background: #10b981;
            color: #022c22;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            font-size: 13px;
          }
          .toolbar button:hover {
            background: #34d399;
          }
          .content-wrapper {
            margin-top: 50px;
          }
          h1, h2, h3, h4 { margin: 0; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th, td { padding: ${isThermal ? '3px 2px' : '6px 8px'}; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background-color: #f8fafc; font-weight: 600; color: #334155; font-size: ${isThermal ? '9px' : '11px'}; text-transform: uppercase; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .text-emerald { color: #059669; }
          .text-slate-500 { color: #64748b; }
          .text-slate-700 { color: #334155; }
          .bg-slate-50 { background-color: #f8fafc; }
          .border-dashed { border-style: dashed; }
          .border-t { border-top: 1px solid #cbd5e1; }
          .border-b { border-bottom: 1px solid #cbd5e1; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .py-2 { padding-top: 8px; padding-bottom: 8px; }
          .footer-sign { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
          .sign-box { text-align: center; width: 180px; }
          .sign-line { margin-top: 50px; border-bottom: 1px solid #64748b; }
          @media print {
            .toolbar { display: none !important; }
            .content-wrapper { margin-top: 0 !important; }
            body { padding: 0 !important; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <span style="font-weight: 600; font-size: 14px;">${title}</span>
          <div>
            <button onclick="window.print()">🖨️ Cetak Dokumen / Simpan PDF</button>
            <button onclick="window.close()" style="background: #475569; color: white; margin-left: 8px;">Tutup</button>
          </div>
        </div>
        <div class="content-wrapper">
          ${contentHtml}
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
};

/**
 * Export tabular data as Excel-friendly CSV with UTF-8 BOM
 */
export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escapeCell = (val: string | number) => {
    const stringVal = String(val ?? '');
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  // UTF-8 BOM for Excel to properly render accents and rupiah symbols
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.endsWith('.csv') ? filename : `${filename}.csv`}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
