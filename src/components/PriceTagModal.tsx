import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  Tag,
  Grid,
  Check,
  CheckSquare,
  Square,
  Search,
  Sliders,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Minus,
  RotateCcw,
  Percent,
  MapPin,
  Barcode as BarcodeIcon,
  Store,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateBarcodeSvgString } from '../utils/barcodeGenerator';
import { printViaIframe, openPrintWindow } from '../utils/printHelper';

export type PaperSize = 'a4' | 'f4';

export type TagTemplate = 'standard_shelf' | 'medium_shelf' | 'promo_pop' | 'barcode_sticker';

export type TagThemeStyle = 'classic' | 'modern_retail' | 'promo_yellow' | 'clean_minimal';

interface SelectedProductTag {
  product: Product;
  copies: number;
}

interface PriceTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedProduct?: Product | null;
}

export const PriceTagModal: React.FC<PriceTagModalProps> = ({
  isOpen,
  onClose,
  initialSelectedProduct,
}) => {
  const { products, categories, settings } = usePOS();

  // Paper & Layout settings
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [template, setTemplate] = useState<TagTemplate>('standard_shelf');
  const [themeStyle, setThemeStyle] = useState<TagThemeStyle>('classic');

  // Customization Toggles
  const [showStoreHeader, setShowStoreHeader] = useState<boolean>(true);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);
  const [showAisle, setShowAisle] = useState<boolean>(true);
  const [showUnit, setShowUnit] = useState<boolean>(true);
  const [showDate, setShowDate] = useState<boolean>(true);
  const [showCutGuide, setShowCutGuide] = useState<boolean>(true);
  const [customPromoText, setCustomPromoText] = useState<string>('HARGA SPESIAL');

  // Product Selection State (Map product ID to copies)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(() => {
    if (initialSelectedProduct) {
      return { [initialSelectedProduct.id]: 1 };
    }
    // Default to all products with 1 copy
    const initialMap: Record<string, number> = {};
    products.slice(0, 12).forEach((p) => {
      initialMap[p.id] = 1;
    });
    return initialMap;
  });

  // Filters for selection list
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'preview' | 'items'>('preview');

  // Handle single initial product updates
  React.useEffect(() => {
    if (initialSelectedProduct) {
      setSelectedItems({ [initialSelectedProduct.id]: 1 });
      setActiveTab('preview');
    }
  }, [initialSelectedProduct]);

  // Filtered product catalog for picker
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, categoryFilter]);

  // Flattened list of tags according to copies
  const flattenedTagsList: Product[] = useMemo(() => {
    const list: Product[] = [];
    products.forEach((p) => {
      const count = selectedItems[p.id] || 0;
      for (let i = 0; i < count; i++) {
        list.push(p);
      }
    });
    return list;
  }, [products, selectedItems]);

  // Layout Grid Dimensions per page
  // A4: 210 x 297 mm, F4: 215 x 330 mm
  const gridConfig = useMemo(() => {
    switch (template) {
      case 'standard_shelf':
        // 4 cols x 8 rows (A4 = 32 items) or 4 cols x 9 rows (F4 = 36 items)
        return {
          cols: 4,
          rows: paperSize === 'f4' ? 9 : 8,
          itemsPerPage: paperSize === 'f4' ? 36 : 32,
          colWidth: paperSize === 'f4' ? '49mm' : '47.5mm',
          rowHeight: paperSize === 'f4' ? '33mm' : '33.5mm',
          name: 'Label Rak Standar (Minimarket)',
          desc: 'Cocok untuk selot mika rak gondola minimarket (±50×33mm)',
        };
      case 'medium_shelf':
        // 3 cols x 6 rows (A4 = 18 items) or 3 cols x 7 rows (F4 = 21 items)
        return {
          cols: 3,
          rows: paperSize === 'f4' ? 7 : 6,
          itemsPerPage: paperSize === 'f4' ? 21 : 18,
          colWidth: paperSize === 'f4' ? '66mm' : '64mm',
          rowHeight: paperSize === 'f4' ? '43mm' : '45mm',
          name: 'Label Rak Sedang & Lengkap',
          desc: 'Tampilan lebih lega dengan Brand, Kategori & Barcode besar (±65×45mm)',
        };
      case 'promo_pop':
        // 2 cols x 4 rows (A4 = 8 items) or 2 cols x 5 rows (F4 = 10 items)
        return {
          cols: 2,
          rows: paperSize === 'f4' ? 5 : 4,
          itemsPerPage: paperSize === 'f4' ? 10 : 8,
          colWidth: paperSize === 'f4' ? '100mm' : '97mm',
          rowHeight: paperSize === 'f4' ? '60mm' : '68mm',
          name: 'Label Promo & POP Diskon',
          desc: 'Ukuran besar dengan badge promo eye-catching untuk display utama',
        };
      case 'barcode_sticker':
        // 5 cols x 10 rows (A4 = 50 items) or 5 cols x 12 rows (F4 = 60 items)
        return {
          cols: 5,
          rows: paperSize === 'f4' ? 12 : 10,
          itemsPerPage: paperSize === 'f4' ? 60 : 50,
          colWidth: paperSize === 'f4' ? '39mm' : '38mm',
          rowHeight: paperSize === 'f4' ? '25mm' : '26mm',
          name: 'Stiker Barcode Fisik Produk',
          desc: 'Ukuran ringkas untuk ditempel langsung di kemasan fisik barang',
        };
    }
  }, [template, paperSize]);

  const totalTagsCount = flattenedTagsList.length;
  const totalPages = Math.max(1, Math.ceil(totalTagsCount / gridConfig.itemsPerPage));

  // Current page items for preview
  const currentPageTags = useMemo(() => {
    const startIdx = (previewPage - 1) * gridConfig.itemsPerPage;
    return flattenedTagsList.slice(startIdx, startIdx + gridConfig.itemsPerPage);
  }, [flattenedTagsList, previewPage, gridConfig.itemsPerPage]);

  // Adjust preview page if out of bounds
  React.useEffect(() => {
    if (previewPage > totalPages) {
      setPreviewPage(totalPages);
    }
  }, [totalPages, previewPage]);

  // Selection handlers
  const handleToggleSelect = (productId: string) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = 1;
      }
      return next;
    });
  };

  const handleUpdateCopies = (productId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[productId] || 0;
      const nextVal = Math.max(0, current + delta);
      const next = { ...prev };
      if (nextVal === 0) {
        delete next[productId];
      } else {
        next[productId] = nextVal;
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      filteredProducts.forEach((p) => {
        next[p.id] = next[p.id] || 1;
      });
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      filteredProducts.forEach((p) => {
        delete next[p.id];
      });
      return next;
    });
  };

  const handleSetStockCopies = () => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      filteredProducts.forEach((p) => {
        if (p.stock > 0) {
          next[p.id] = p.stock;
        }
      });
      return next;
    });
  };

  const handleResetToOne = () => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        next[id] = 1;
      });
      return next;
    });
  };

  // Helper to generate a single Pricetag Card HTML for print & preview
  const generateTagHtml = (product: Product, isForPrint: boolean = false) => {
    const barcodeCode = product.barcode || product.sku;
    const barcodeSvg = showBarcode
      ? generateBarcodeSvgString(barcodeCode, {
          height: template === 'barcode_sticker' ? 22 : template === 'promo_pop' ? 32 : 24,
          fontSize: 8,
          showText: false,
          quietZone: 4,
        })
      : '';

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    const categoryObj = categories.find((c) => c.id === product.categoryId);
    const categoryName = categoryObj ? categoryObj.name : product.categoryId;

    const formattedPrice = formatCurrency(product.price, settings.currency);

    // Theme Specific Styling Classes / Inline Styles
    let themeBg = '#ffffff';
    let themeHeaderBg = '#f1f5f9';
    let themeHeaderColor = '#0f172a';
    let themeBorder = showCutGuide ? '1px dashed #cbd5e1' : '1px solid #e2e8f0';
    let priceColor = '#0f172a';
    let accentColor = '#059669';

    if (themeStyle === 'classic') {
      themeHeaderBg = '#0f172a';
      themeHeaderColor = '#ffffff';
      priceColor = '#0f172a';
      themeBorder = showCutGuide ? '1px dashed #94a3b8' : '1px solid #0f172a';
    } else if (themeStyle === 'modern_retail') {
      themeHeaderBg = '#0284c7';
      themeHeaderColor = '#ffffff';
      priceColor = '#0369a1';
      accentColor = '#0284c7';
      themeBorder = showCutGuide ? '1px dashed #7dd3fc' : '1px solid #0284c7';
    } else if (themeStyle === 'promo_yellow') {
      themeHeaderBg = '#facc15';
      themeHeaderColor = '#854d0e';
      priceColor = '#dc2626';
      accentColor = '#dc2626';
      themeBorder = showCutGuide ? '1px dashed #f59e0b' : '1px solid #eab308';
    }

    if (template === 'standard_shelf') {
      return `
        <div style="box-sizing: border-box; width: 100%; height: 100%; padding: 4px; border: ${themeBorder}; background: ${themeBg}; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative;">
          ${
            showStoreHeader
              ? `
            <div style="background: ${themeHeaderBg}; color: ${themeHeaderColor}; padding: 1.5px 4px; display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; font-weight: 800; text-transform: uppercase; border-radius: 2px; line-height: 1;">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${settings.storeName}</span>
              ${showDate ? `<span style="font-size: 6.5px; opacity: 0.85;">${todayStr}</span>` : ''}
            </div>`
              : ''
          }
          
          <div style="margin-top: 2px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 9.5px; font-weight: 800; color: #0f172a; line-height: 1.15; max-height: 22px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                ${product.name}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 7px; color: #64748b; margin-top: 1px;">
                ${showSku ? `<span>SKU: <strong>${product.sku}</strong></span>` : '<span></span>'}
                ${showAisle && product.aisle ? `<span style="font-weight: 600; color: #0369a1; background: #f0f9ff; padding: 0 2px; border-radius: 2px;">${product.aisle}</span>` : ''}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2px; border-top: 1px dotted #e2e8f0; padding-top: 2px;">
              <div style="max-width: 48%;">
                ${barcodeSvg}
                <div style="font-family: monospace; font-size: 6.5px; text-align: center; color: #475569; letter-spacing: 0.5px; margin-top: -1px;">${barcodeCode}</div>
              </div>

              <div style="text-align: right; line-height: 1;">
                ${showUnit ? `<div style="font-size: 7px; color: #64748b; font-weight: 600;">per ${product.unit || 'pcs'}</div>` : ''}
                <div style="font-size: 13px; font-weight: 900; color: ${priceColor}; letter-spacing: -0.5px; font-family: ui-monospace, monospace; margin-top: 1px;">
                  ${formattedPrice}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (template === 'medium_shelf') {
      return `
        <div style="box-sizing: border-box; width: 100%; height: 100%; padding: 6px; border: ${themeBorder}; background: ${themeBg}; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div>
            ${
              showStoreHeader
                ? `
              <div style="background: ${themeHeaderBg}; color: ${themeHeaderColor}; padding: 2px 6px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; font-weight: 800; text-transform: uppercase; border-radius: 3px; line-height: 1.2;">
                <span>${settings.storeName} - ${settings.branchName || 'OFFICIAL'}</span>
                ${showDate ? `<span style="font-size: 7.5px;">${todayStr}</span>` : ''}
              </div>`
                : ''
            }
            
            <div style="margin-top: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; color: #64748b; font-weight: 600;">
                <span>${product.brand ? product.brand.toUpperCase() : categoryName.toUpperCase()}</span>
                ${showAisle && product.aisle ? `<span style="color: #0369a1; background: #e0f2fe; padding: 1px 4px; border-radius: 3px; font-size: 7px;">${product.aisle}</span>` : ''}
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #0f172a; line-height: 1.2; max-height: 28px; overflow: hidden; margin-top: 1px;">
                ${product.name}
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
            <div style="max-width: 50%;">
              ${barcodeSvg}
              <div style="font-family: monospace; font-size: 7.5px; text-align: center; color: #475569; font-weight: bold; margin-top: 1px;">${barcodeCode}</div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 8px; color: #64748b; font-weight: 700; text-transform: uppercase;">HARGA PAS / ${product.unit || 'PCS'}</div>
              <div style="font-size: 16px; font-weight: 900; color: ${priceColor}; font-family: ui-monospace, monospace; line-height: 1; margin-top: 2px;">
                ${formattedPrice}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (template === 'promo_pop') {
      return `
        <div style="box-sizing: border-box; width: 100%; height: 100%; padding: 8px; border: 2px solid #dc2626; background: #fffdf5; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative;">
          <!-- Promo Banner -->
          <div style="background: #dc2626; color: #ffffff; padding: 3px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 900; letter-spacing: 0.5px; border-radius: 4px;">
            <span>★ ${customPromoText || 'PROMO SPESIAL'} ★</span>
            <span style="font-size: 8px; background: #fef08a; color: #854d0e; padding: 1px 4px; border-radius: 2px;">${settings.storeName}</span>
          </div>

          <div style="margin: 4px 0;">
            <div style="font-size: 8.5px; color: #64748b; font-weight: 700; text-transform: uppercase;">${product.brand || categoryName}</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; line-height: 1.2; max-height: 34px; overflow: hidden;">
              ${product.name}
            </div>
            ${showAisle && product.aisle ? `<div style="font-size: 8px; color: #0369a1; margin-top: 2px;">Lokasi: <strong>${product.aisle}</strong></div>` : ''}
          </div>

          <div style="background: #fef2f2; border: 1px dashed #f87171; border-radius: 6px; padding: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div style="max-width: 45%;">
              ${barcodeSvg}
              <div style="font-family: monospace; font-size: 8px; text-align: center; color: #475569; font-weight: bold;">${barcodeCode}</div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 8.5px; color: #991b1b; font-weight: 800; text-transform: uppercase;">SPESIAL HARGA:</div>
              <div style="font-size: 20px; font-weight: 900; color: #dc2626; font-family: ui-monospace, monospace; line-height: 1; margin-top: 2px;">
                ${formattedPrice}
              </div>
              <div style="font-size: 7.5px; color: #7f1d1d; font-weight: 600; margin-top: 2px;">per ${product.unit || 'pcs'} (Termasuk Pajak)</div>
            </div>
          </div>
        </div>
      `;
    }

    // Default: barcode_sticker
    return `
      <div style="box-sizing: border-box; width: 100%; height: 100%; padding: 3px 4px; border: ${themeBorder}; background: ${themeBg}; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
        <div style="font-size: 7px; font-weight: 800; color: #0f172a; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1;">
          ${product.name}
        </div>

        <div style="margin: 1px 0; width: 100%;">
          ${barcodeSvg}
          <div style="font-family: monospace; font-size: 6.5px; color: #334155; font-weight: bold; letter-spacing: 0.5px; line-height: 1;">${barcodeCode}</div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dotted #cbd5e1; padding-top: 1px; font-size: 6.5px; line-height: 1;">
          <span style="color: #64748b; font-weight: 600;">${settings.storeName.slice(0, 10)}</span>
          <span style="font-weight: 900; font-size: 8.5px; color: #0f172a; font-family: monospace;">${formattedPrice}</span>
        </div>
      </div>
    `;
  };

  // Generate full HTML for whole print job (multi-page)
  const generateFullPrintHtml = () => {
    // Break tags into pages
    const pagesArray: Product[][] = [];
    for (let i = 0; i < flattenedTagsList.length; i += gridConfig.itemsPerPage) {
      pagesArray.push(flattenedTagsList.slice(i, i + gridConfig.itemsPerPage));
    }

    const pageSizeCss = paperSize === 'f4' ? '215mm 330mm portrait' : '210mm 297mm portrait';
    const pagePadding = paperSize === 'f4' ? '6mm 6mm' : '6mm 6mm';

    const pagesHtml = pagesArray
      .map((pageTags, pageIdx) => {
        // Build CSS Grid for tags
        const tagsHtml = pageTags
          .map((prod) => `<div style="width: 100%; height: 100%;">${generateTagHtml(prod, true)}</div>`)
          .join('');

        return `
        <div class="print-page" style="page-break-after: ${pageIdx < pagesArray.length - 1 ? 'always' : 'auto'}; width: 100%; height: 100%; box-sizing: border-box; display: grid; grid-template-columns: repeat(${gridConfig.cols}, 1fr); grid-template-rows: repeat(${gridConfig.rows}, ${gridConfig.rowHeight}); gap: 3.5mm; padding: 0; margin: 0 auto;">
          ${tagsHtml}
        </div>
      `;
      })
      .join('');

    return `
      <style>
        @page {
          size: ${pageSizeCss};
          margin: ${pagePadding};
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .print-page {
          margin-bottom: 0;
        }
        @media screen {
          .print-page {
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            background: white;
          }
        }
      </style>
      <div>
        ${pagesHtml}
      </div>
    `;
  };

  const handlePrint = () => {
    if (flattenedTagsList.length === 0) return;
    const printHtml = generateFullPrintHtml();
    const docTitle = `Pricetag_${paperSize.toUpperCase()}_${settings.storeName.replace(/\s+/g, '_')}`;
    printViaIframe(printHtml, docTitle, paperSize);
  };

  const handleOpenNewWindow = () => {
    if (flattenedTagsList.length === 0) return;
    const printHtml = generateFullPrintHtml();
    const docTitle = `Pricetag POS - ${paperSize.toUpperCase()}`;
    openPrintWindow(printHtml, docTitle, paperSize);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-hidden animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-6xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Cetak Pricetag & Label Rak Produk
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                  {paperSize.toUpperCase()} Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilihan format kertas A4 & F4 (Folio) dengan panduan garis potong dan barcode scannable.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Tab Switcher */}
            <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Pratinjau Lembar</span>
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'items'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Pilih Item ({totalTagsCount})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Settings Sidebar */}
          <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 overflow-y-auto space-y-4 text-xs">
            {/* 1. Paper Size Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>1. Ukuran Kertas Cetak</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaperSize('a4')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paperSize === 'a4'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm">Kertas A4</span>
                    {paperSize === 'a4' && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    210 × 297 mm (Standar)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaperSize('f4')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paperSize === 'f4'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm">Kertas F4</span>
                    {paperSize === 'f4' && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    215 × 330 mm (Folio)
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Tag Layout Template */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-blue-500" />
                <span>2. Tipe Format Pricetag</span>
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'standard_shelf',
                    name: 'Label Rak Standar (4 Kolom)',
                    badge: `${paperSize === 'f4' ? '36' : '32'} pcs / lembar`,
                    desc: 'Ukuran ideal selot mika gondola (±50×33mm)',
                  },
                  {
                    id: 'medium_shelf',
                    name: 'Label Rak Lengkap (3 Kolom)',
                    badge: `${paperSize === 'f4' ? '21' : '18'} pcs / lembar`,
                    desc: 'Lebih lega dengan Brand & Kategori (±65×45mm)',
                  },
                  {
                    id: 'promo_pop',
                    name: 'Label Promo & POP Diskon (2 Kolom)',
                    badge: `${paperSize === 'f4' ? '10' : '8'} pcs / lembar`,
                    desc: 'Ukuran besar dengan banner promo mencolok',
                  },
                  {
                    id: 'barcode_sticker',
                    name: 'Stiker Barcode Fisik (5 Kolom)',
                    badge: `${paperSize === 'f4' ? '60' : '50'} pcs / lembar`,
                    desc: 'Format compact khusus kemasan produk (±38×25mm)',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id as TagTemplate)}
                    className={`w-full p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      template === item.id
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-white font-bold ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        {item.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 font-mono text-slate-600 dark:text-slate-300">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Theme & Style */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>3. Gaya & Aksen Desain</span>
              </label>
              <select
                value={themeStyle}
                onChange={(e) => setThemeStyle(e.target.value as TagThemeStyle)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              >
                <option value="classic">Klasik Retail (Header Hitam Tegas)</option>
                <option value="modern_retail">Modern Biru (Minimarket Segar)</option>
                <option value="promo_yellow">Kuning Diskon (Eye-Catching Promo)</option>
                <option value="clean_minimal">Minimalis Bersih (Border Garis Halus)</option>
              </select>
            </div>

            {/* 4. Display Content Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                4. Opsi Konten Pricetag
              </label>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Nama Toko ({settings.storeName})</span>
                  <input
                    type="checkbox"
                    checked={showStoreHeader}
                    onChange={(e) => setShowStoreHeader(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Barcode Scannable (SVG)</span>
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Kode SKU / Barcode Angka</span>
                  <input
                    type="checkbox"
                    checked={showSku}
                    onChange={(e) => setShowSku(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Lokasi Rak (Aisle Gondola)</span>
                  <input
                    type="checkbox"
                    checked={showAisle}
                    onChange={(e) => setShowAisle(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Satuan Produk (/pcs, /kg)</span>
                  <input
                    type="checkbox"
                    checked={showUnit}
                    onChange={(e) => setShowUnit(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Tanggal Cetak / Update</span>
                  <input
                    type="checkbox"
                    checked={showDate}
                    onChange={(e) => setShowDate(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Garis Putus Potong (Cutter Guide)</span>
                  <input
                    type="checkbox"
                    checked={showCutGuide}
                    onChange={(e) => setShowCutGuide(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              </div>

              {template === 'promo_pop' && (
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Teks Banner Promo:
                  </label>
                  <input
                    type="text"
                    value={customPromoText}
                    onChange={(e) => setCustomPromoText(e.target.value)}
                    placeholder="misal: PROMO SPESIAL / HEMAT"
                    className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white uppercase font-bold"
                  />
                </div>
              )}
            </div>

            {/* Summary Box */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Total Label Siap:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{totalTagsCount} pcs</strong>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Kapasitas Lembar:</span>
                <strong className="text-slate-900 dark:text-white font-mono">
                  {gridConfig.itemsPerPage} label / lembar
                </strong>
              </div>
              <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Estimasi Kertas:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {totalPages} Lembar {paperSize.toUpperCase()}
                </strong>
              </div>
            </div>
          </div>

          {/* Right Main Content (Interactive Preview or Item Selector) */}
          <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
            {activeTab === 'preview' ? (
              /* LIVE SHEET PREVIEW */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Pratinjau Kertas {paperSize.toUpperCase()} (Halaman {previewPage} dari {totalPages})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • {gridConfig.cols} Kolom × {gridConfig.rows} Baris
                    </span>
                  </div>

                  {/* Page Navigator */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl">
                      <button
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        disabled={previewPage === 1}
                        className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono font-bold px-1">
                        {previewPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                        disabled={previewPage === totalPages}
                        className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Scaled Visual Paper Canvas */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start">
                  {totalTagsCount === 0 ? (
                    <div className="my-auto text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md">
                      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Belum Ada Item Produk Dipilih
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        Pilih produk yang ingin dicetak label rak atau atur jumlah salinan pada tab 'Pilih Item'.
                      </p>
                      <button
                        onClick={() => setActiveTab('items')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                      >
                        Buka Pemilih Produk ({products.length} Produk Tersedia)
                      </button>
                    </div>
                  ) : (
                    <div
                      className="bg-white text-slate-900 shadow-2xl border border-slate-300 transition-all rounded-sm"
                      style={{
                        width: paperSize === 'f4' ? '215mm' : '210mm',
                        minHeight: paperSize === 'f4' ? '330mm' : '297mm',
                        padding: '6mm',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
                          gridTemplateRows: `repeat(${gridConfig.rows}, ${gridConfig.rowHeight})`,
                          gap: '3mm',
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        {currentPageTags.map((prod, idx) => (
                          <div
                            key={`${prod.id}-${idx}`}
                            style={{ width: '100%', height: '100%' }}
                            dangerouslySetInnerHTML={{ __html: generateTagHtml(prod, false) }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* PRODUCT SELECTION & COPIES MANAGER */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search & Actions Header */}
                <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama produk, SKU, barcode, atau brand..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="all">Semua Kategori</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Actions */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleSelectAllFiltered}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300 text-[11px] cursor-pointer"
                      >
                        Pilih Semua ({filteredProducts.length})
                      </button>
                      <button
                        onClick={handleDeselectAllFiltered}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300 text-[11px] cursor-pointer"
                      >
                        Batal Pilih
                      </button>
                      <button
                        onClick={handleResetToOne}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300 text-[11px] cursor-pointer"
                      >
                        Set 1 Qty Tiap Item
                      </button>
                      <button
                        onClick={handleSetStockCopies}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-[11px] cursor-pointer"
                      >
                        Set Qty = Stok Fisik
                      </button>
                    </div>

                    <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                      Total Label Terpilih: <strong className="text-slate-900 dark:text-white font-mono">{totalTagsCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Products List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const copies = selectedItems[p.id] || 0;
                      const isSelected = copies > 0;
                      const categoryObj = categories.find((c) => c.id === p.categoryId);

                      return (
                        <div
                          key={p.id}
                          className={`p-3 flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(p.id)}
                              className="text-slate-400 hover:text-emerald-500 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-10 h-10 object-cover rounded-lg bg-slate-100 border border-slate-200 dark:border-slate-700"
                            />

                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{p.name}</span>
                                {p.aisle && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                    {p.aisle}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                                <span>SKU: {p.sku}</span>
                                <span>•</span>
                                <span>Barcode: {p.barcode}</span>
                                <span>•</span>
                                <span>Stok: {p.stock} {p.unit}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                                {formatCurrency(p.price, settings.currency)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                per {p.unit || 'pcs'}
                              </div>
                            </div>

                            {/* Copies Quantity Selector */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                              <button
                                onClick={() => handleUpdateCopies(p.id, -1)}
                                disabled={copies === 0}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-xs text-slate-900 dark:text-white">
                                {copies}
                              </span>
                              <button
                                onClick={() => handleUpdateCopies(p.id, 1)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Tidak ada produk sesuai filter pencarian.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Format: <strong className="text-slate-900 dark:text-white uppercase font-mono">Kertas {paperSize}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 dark:text-slate-400">
              Total Label: <strong className="text-slate-900 dark:text-white font-mono">{totalTagsCount} Label</strong> ({totalPages} Lembar)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewWindow}
              disabled={totalTagsCount === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
              title="Buka pratinjau cetak di tab/jendela baru untuk save PDF"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Tab PDF</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={totalTagsCount === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-40 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Pricetag ({paperSize.toUpperCase()})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
