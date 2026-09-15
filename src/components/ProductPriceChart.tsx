import React, { useState } from 'react';
import { PriceHistoryRecord } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ProductPriceChartProps {
  history: PriceHistoryRecord[];
  currency?: string;
  unitName?: string;
}

export const ProductPriceChart: React.FC<ProductPriceChartProps> = ({
  history,
  currency = 'IDR',
  unitName = 'pcs',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // If history is empty
  if (!history || history.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 text-xs">
        <p>Belum ada data riwayat harga yang tercatat.</p>
      </div>
    );
  }

  // Sort chronologically ascending
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Chart layout parameters
  const svgWidth = 700;
  const svgHeight = 260;
  const paddingLeft = 68;
  const paddingRight = 36;
  const paddingTop = 28;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Extract all values to determine Y domain
  const allCosts = sorted.map((p) => p.costPrice);
  const allPrices = sorted.map((p) => p.sellingPrice);
  const minValRaw = Math.min(...allCosts, ...allPrices);
  const maxValRaw = Math.max(...allCosts, ...allPrices);

  // Buffer range
  const rangeMargin = Math.max(500, (maxValRaw - minValRaw) * 0.15);
  const minY = Math.max(0, Math.floor((minValRaw - rangeMargin) / 500) * 500);
  const maxY = Math.ceil((maxValRaw + rangeMargin) / 500) * 500;
  const yDomain = maxY - minY || 1000;

  // X coordinate calculation
  const getX = (index: number) => {
    if (sorted.length === 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (sorted.length - 1)) * chartWidth;
  };

  // Y coordinate calculation
  const getY = (val: number) => {
    const ratio = (val - minY) / yDomain;
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Generate SVG paths
  const pricePoints = sorted.map((p, idx) => ({ x: getX(idx), y: getY(p.sellingPrice), data: p }));
  const costPoints = sorted.map((p, idx) => ({ x: getX(idx), y: getY(p.costPrice), data: p }));

  const pricePathD = pricePoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
  const costPathD = costPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');

  // Margin Spread Polygon (Between price line and cost line)
  // Price from left to right, then Cost from right to left
  const reverseCostPoints = [...costPoints].reverse();
  const areaD = pricePoints.length > 1
    ? `${pricePathD} L ${reverseCostPoints[0].x},${reverseCostPoints[0].y} ` +
      reverseCostPoints.map((pt) => `L ${pt.x},${pt.y}`).join(' ') +
      ' Z'
    : '';

  // Generate Y axis grid lines (4 intervals)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const val = Math.round(minY + ratio * yDomain);
    const y = paddingTop + chartHeight - ratio * chartHeight;
    return { val, y };
  });

  const activeRecord = hoveredIndex !== null ? sorted[hoveredIndex] : sorted[sorted.length - 1];
  const activeX = hoveredIndex !== null ? getX(hoveredIndex) : getX(sorted.length - 1);
  const activePriceY = getY(activeRecord.sellingPrice);
  const activeCostY = getY(activeRecord.costPrice);

  const activeGrossMargin = activeRecord.sellingPrice - activeRecord.costPrice;
  const activeMarginPercent = activeRecord.sellingPrice > 0
    ? ((activeGrossMargin / activeRecord.sellingPrice) * 100).toFixed(1)
    : '0';

  return (
    <div className="w-full space-y-3">
      {/* Legend & Current Hover Detail Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-4 text-xs">
          {/* Selling Price Legend */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Harga Jual (Retail)
            </span>
          </div>

          {/* Cost Price Legend */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500 ring-2 ring-amber-500/20"></span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Harga Modal (HPP Kulakan)
            </span>
          </div>

          {/* Spread Area Legend */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-3.5 h-2.5 rounded-xs bg-emerald-500/20 border border-emerald-500/40"></span>
            <span className="text-slate-500 dark:text-slate-400">
              Area Margin Laba Kotor
            </span>
          </div>
        </div>

        {/* Hover / Point Summary Badge */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {formatDate(activeRecord.date)}:
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            Jual: {formatCurrency(activeRecord.sellingPrice, currency)}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            Modal: {formatCurrency(activeRecord.costPrice, currency)}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-[10px]">
            Margin +{activeMarginPercent}%
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 sm:p-4 overflow-hidden shadow-xs">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Gradient for Margin Spread Area */}
            <linearGradient id="marginSpreadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.10" />
            </linearGradient>

            {/* Glowing line filters */}
            <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#10b981" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Horizontal Grid lines & Y-Axis Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={svgWidth - paddingRight}
                y2={tick.y}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800/80"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500 font-semibold"
              >
                Rp {tick.val >= 1000 ? `${(tick.val / 1000).toFixed(tick.val % 1000 !== 0 ? 1 : 0)}k` : tick.val}
              </text>
            </g>
          ))}

          {/* Area between Selling Price and Cost Price */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#marginSpreadGrad)"
              className="transition-all duration-300"
            />
          )}

          {/* Cost Price Line (HPP) */}
          <path
            d={costPathD}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Selling Price Line (Retail) */}
          <path
            d={pricePathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glowLine)"
            className="transition-all duration-300"
          />

          {/* Vertical Tracking Line on Active Hover */}
          <line
            x1={activeX}
            y1={paddingTop}
            x2={activeX}
            y2={paddingTop + chartHeight}
            stroke="currentColor"
            className="text-indigo-400 dark:text-indigo-500"
            strokeDasharray="2 2"
            strokeWidth="1.5"
          />

          {/* Data Points on the Cost Line */}
          {costPoints.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g key={`cost-pt-${idx}`} className="cursor-pointer">
                <rect
                  x={pt.x - (isHovered ? 6 : 4.5)}
                  y={pt.y - (isHovered ? 6 : 4.5)}
                  width={isHovered ? 12 : 9}
                  height={isHovered ? 12 : 9}
                  fill="#ffffff"
                  stroke="#f59e0b"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all"
                  transform={`rotate(45, ${pt.x}, ${pt.y})`}
                />
              </g>
            );
          })}

          {/* Data Points on the Selling Price Line */}
          {pricePoints.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g key={`price-pt-${idx}`} className="cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 7 : 5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all"
                />
              </g>
            );
          })}

          {/* Invisible wide vertical hit areas for easy hover interactions */}
          {sorted.map((_, idx) => {
            const x = getX(idx);
            const colWidth = chartWidth / Math.max(1, sorted.length - 1);
            return (
              <rect
                key={`hit-${idx}`}
                x={x - colWidth / 2}
                y={paddingTop}
                width={colWidth}
                height={chartHeight + paddingBottom}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
              />
            );
          })}

          {/* X-Axis Date Labels */}
          {sorted.map((item, idx) => {
            // Only show reasonable number of labels if many points
            if (sorted.length > 8 && idx % Math.ceil(sorted.length / 5) !== 0 && idx !== sorted.length - 1) {
              return null;
            }
            const x = getX(idx);
            const d = new Date(item.date);
            const label = `${d.getDate()}/${d.getMonth() + 1}`;
            return (
              <text
                key={`xlabel-${idx}`}
                x={x}
                y={svgHeight - 12}
                textAnchor="middle"
                className={`text-[10px] font-mono font-medium ${
                  hoveredIndex === idx
                    ? 'fill-indigo-600 dark:fill-indigo-400 font-bold'
                    : 'fill-slate-400 dark:fill-slate-500'
                }`}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
