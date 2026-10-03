import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Clock,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import {
  DateFilterPreset,
  getPresetDateRange,
  toLocalYMD,
  formatPeriodLabel,
} from '../utils/dateFilters';

export interface DateFilterBarProps {
  idPrefix?: string;
  preset: DateFilterPreset;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: DateFilterPreset, startDate: string, endDate: string) => void;
  onDateChange: (startDate: string, endDate: string) => void;
  totalFilteredCount: number;
  totalAllCount: number;
  label?: string;
  summaryBadge?: React.ReactNode;
  className?: string;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  idPrefix = 'date-filter',
  preset,
  startDate,
  endDate,
  onPresetChange,
  onDateChange,
  totalFilteredCount,
  totalAllCount,
  label = 'Filter Tanggal',
  summaryBadge,
  className = '',
}) => {
  const [isCustomOpen, setIsCustomOpen] = useState(preset === 'custom');

  const handleSelectPreset = (newPreset: DateFilterPreset) => {
    if (newPreset === 'custom') {
      setIsCustomOpen(true);
      const today = toLocalYMD(new Date());
      const s = startDate || today;
      const e = endDate || today;
      onPresetChange('custom', s, e);
    } else {
      setIsCustomOpen(false);
      const range = getPresetDateRange(newPreset);
      onPresetChange(newPreset, range.startDate, range.endDate);
    }
  };

  // Stepper: step -1 or +1 day when single date is selected
  const isSingleDay = Boolean(startDate && endDate && startDate === endDate);

  const handleStepDay = (delta: number) => {
    const baseStr = startDate || toLocalYMD(new Date());
    const parts = baseStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [y, m, d] = parts;
      const dateObj = new Date(y, m - 1, d);
      if (!isNaN(dateObj.getTime())) {
        dateObj.setDate(dateObj.getDate() + delta);
        const newYmd = toLocalYMD(dateObj);
        onPresetChange('custom', newYmd, newYmd);
        return;
      }
    }
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + delta);
    const newYmd = toLocalYMD(fallback);
    onPresetChange('custom', newYmd, newYmd);
  };

  const handleResetToAll = () => {
    setIsCustomOpen(false);
    onPresetChange('all', '', '');
  };

  const isFilterActive = preset !== 'all' || Boolean(startDate || endDate);

  return (
    <div
      id={`${idPrefix}-container`}
      className={`px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs ${className}`}
    >
      {/* Left: Presets and Date Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold text-[11px] mr-1">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{label}:</span>
        </div>

        {/* Preset Chips */}
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <button
            type="button"
            id={`${idPrefix}-preset-all`}
            onClick={() => handleSelectPreset('all')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer ${
              preset === 'all' && !startDate && !endDate
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua
          </button>

          <button
            type="button"
            id={`${idPrefix}-preset-today`}
            onClick={() => handleSelectPreset('today')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
              preset === 'today'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
            title="Tampilkan hanya data hari ini untuk menjaga tampilan tetap fokus & tidak penuh"
          >
            <Clock className="w-3 h-3" />
            <span>Hari Ini</span>
          </button>

          <button
            type="button"
            id={`${idPrefix}-preset-yesterday`}
            onClick={() => handleSelectPreset('yesterday')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer ${
              preset === 'yesterday'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            Kemarin
          </button>

          <button
            type="button"
            id={`${idPrefix}-preset-last7days`}
            onClick={() => handleSelectPreset('last7days')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer ${
              preset === 'last7days'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            7 Hari
          </button>

          <button
            type="button"
            id={`${idPrefix}-preset-thismonth`}
            onClick={() => handleSelectPreset('thismonth')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer ${
              preset === 'thismonth'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            Bulan Ini
          </button>

          <button
            type="button"
            id={`${idPrefix}-preset-custom`}
            onClick={() => handleSelectPreset('custom')}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
              preset === 'custom' || isCustomOpen
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
            title="Pilih tanggal tertentu atau rentang tanggal"
          >
            <CalendarDays className="w-3 h-3" />
            <span>Pilih Tanggal</span>
          </button>
        </div>

        {/* Day-by-Day Stepper Navigation if a single date is active */}
        {isSingleDay && (
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              id={`${idPrefix}-btn-prev-day`}
              onClick={() => handleStepDay(-1)}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              title="1 Hari Sebelumnya (H-1)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 px-1">
              {formatPeriodLabel('custom', startDate, endDate)}
            </span>
            <button
              type="button"
              id={`${idPrefix}-btn-next-day`}
              onClick={() => handleStepDay(1)}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              title="1 Hari Berikutnya (H+1)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Custom Date Range Picker Inputs */}
        {(preset === 'custom' || isCustomOpen) && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-2xs animate-in fade-in duration-150">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Dari:</span>
              <input
                type="date"
                id={`${idPrefix}-input-start-date`}
                value={startDate}
                onChange={(e) => {
                  const s = e.target.value;
                  const eDate = endDate && endDate >= s ? endDate : s;
                  onDateChange(s, eDate);
                }}
                className="px-1.5 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-slate-400 font-bold">-</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Sampai:</span>
              <input
                type="date"
                id={`${idPrefix}-input-end-date`}
                value={endDate}
                onChange={(e) => {
                  const eDate = e.target.value;
                  const sDate = startDate && startDate <= eDate ? startDate : eDate;
                  onDateChange(sDate, eDate);
                }}
                className="px-1.5 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Reset Filter Button */}
        {isFilterActive && (
          <button
            type="button"
            id={`${idPrefix}-btn-reset`}
            onClick={handleResetToAll}
            className="px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            title="Hapus filter tanggal & tampilkan seluruh data"
          >
            <X className="w-3 h-3" />
            <span>Reset Tanggal</span>
          </button>
        )}
      </div>

      {/* Right: Info Chip & Summary Metrics */}
      <div className="flex items-center gap-2.5 flex-wrap ml-auto">
        {/* Active Filter Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[11px] shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>
            {isFilterActive ? (
              <>
                Periode: <strong className="text-slate-900 dark:text-white font-bold">{formatPeriodLabel(preset, startDate, endDate)}</strong>
                {' '}(<span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{totalFilteredCount}</span> dari {totalAllCount})
              </>
            ) : (
              <>
                Semua Data (<span className="font-mono font-bold text-slate-900 dark:text-white">{totalAllCount}</span> total)
              </>
            )}
          </span>
        </div>

        {/* Summary Badge (e.g. Total Rupiah, Qty) */}
        {summaryBadge}
      </div>
    </div>
  );
};
