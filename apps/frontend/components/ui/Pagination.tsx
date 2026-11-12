'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/lib/types';

export interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  alwaysShow?: boolean;
  className?: string;
}

function buildPageList(
  current: number,
  totalPages: number,
): Array<number | 'ellipsis-left' | 'ellipsis-right'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [1];

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) {
    pages.push('ellipsis-left');
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push('ellipsis-right');
  }

  pages.push(totalPages);
  return pages;
}

export function Pagination({
  meta,
  onPageChange,
  alwaysShow = false,
  className = '',
}: Readonly<PaginationProps>) {
  const { totalItems, itemsPerPage, currentPage, totalPages } = meta;

  if (!alwaysShow && totalPages <= 1) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);
  const activePage = Math.max(1, Math.min(currentPage, safeTotalPages));
  const safeLimit = Math.max(1, itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (activePage - 1) * safeLimit + 1;
  const endItem = Math.min(activePage * safeLimit, totalItems);
  const items = buildPageList(activePage, safeTotalPages);

  return (
    <nav
      aria-label="Paginación"
      className={`flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row ${className}`}
    >
      <p className="tabular-nums text-xs text-slate-600">
        {totalItems === 0 ? (
          'Sin resultados'
        ) : (
          <>
            Mostrando <strong className="font-semibold text-slate-900">{startItem}</strong>–
            <strong className="font-semibold text-slate-900">{endItem}</strong> de{' '}
            <strong className="font-semibold text-slate-900">{totalItems}</strong> resultados
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(activePage - 1)}
          disabled={activePage <= 1}
          aria-label="Página anterior"
          className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {items.map((item) => {
          if (item === 'ellipsis-left' || item === 'ellipsis-right') {
            return (
              <span
                key={item}
                aria-hidden
                className="inline-flex h-9 w-8 items-center justify-center text-xs text-slate-400"
              >
                …
              </span>
            );
          }

          const isCurrent = item === activePage;

          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={isCurrent ? 'page' : undefined}
              className={`tabular-nums inline-flex h-9 min-w-9 items-center justify-center rounded-[8px] px-2.5 text-xs font-medium transition-colors cursor-pointer ${
                isCurrent
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(activePage + 1)}
          disabled={activePage >= safeTotalPages}
          aria-label="Página siguiente"
          className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45 cursor-pointer"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
