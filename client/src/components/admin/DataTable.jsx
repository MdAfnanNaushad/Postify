import React from 'react';
import { ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  page = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  emptyMessage = 'No records found matching your filters.'
}) => {
  return (
    <div
      style={{ borderRadius: '6px' }}
      className="portal-card rounded-[6px] overflow-hidden flex flex-col shadow-sm"
    >
      {/* Top filter bar */}
      {onSearchChange && (
        <div className="p-3.5 sm:p-4 border-b border-[var(--portal-card-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--portal-subtle)]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ borderRadius: '6px' }}
              className="w-full pl-9 pr-4 py-2 rounded-[6px] text-xs bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] placeholder:text-[var(--portal-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--portal-accent)] transition-all"
            />
          </div>

          <div className="text-xs text-[var(--portal-meta)] font-medium self-end sm:self-auto">
            Total Records: <span className="font-bold text-[var(--portal-heading)]">{totalItems.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Table Body with Responsive Horizontal Scroll */}
      <div className="overflow-x-auto min-h-[200px] relative">
        {loading && (
          <div className="absolute inset-0 bg-[var(--portal-card)]/70 backdrop-blur-[1px] flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--portal-accent)]" />
          </div>
        )}

        <table className="w-full text-left text-xs border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--portal-card-border)] bg-[var(--portal-canvas)]/50 text-[var(--portal-subtle)] uppercase text-[10px] tracking-wider font-semibold select-none">
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--portal-card-border)]">
            {data.length > 0 ? (
              data.map((row, rowIdx) => (
                <tr
                  key={row._id || rowIdx}
                  className="hover:bg-[var(--portal-canvas)]/50 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-4 py-3.5 text-[var(--portal-text)] ${col.className || ''}`}>
                      {col.render ? col.render(row) : (col.accessor ? row[col.accessor] : null)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              !loading && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-[var(--portal-meta)] text-xs">
                    {emptyMessage}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="p-3 border-t border-[var(--portal-card-border)] flex items-center justify-between text-xs text-[var(--portal-meta)]">
          <div>
            Page <span className="font-semibold text-[var(--portal-heading)]">{page}</span> of{' '}
            <span className="font-semibold text-[var(--portal-heading)]">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              style={{ borderRadius: '6px' }}
              className="p-1.5 rounded-[6px] border border-[var(--portal-card-border)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              style={{ borderRadius: '6px' }}
              className="p-1.5 rounded-[6px] border border-[var(--portal-card-border)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
