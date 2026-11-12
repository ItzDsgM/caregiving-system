'use client';

import React, { useState } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { MODALITY_REPORT_LABELS } from '@/lib/constants';
import type { ModalityCategoryReport } from '@/lib/types';

function getModalityLabel(category: ModalityCategoryReport): string {
  return (
    MODALITY_REPORT_LABELS[category.category] ??
    MODALITY_REPORT_LABELS[category.label] ??
    category.label
  );
}

const SLICE_PALETTE = [
  { fill: '#0d9488', bg: 'bg-teal-600', ring: 'ring-teal-200' },
  { fill: '#3b82f6', bg: 'bg-blue-500', ring: 'ring-blue-200' },
  { fill: '#d97706', bg: 'bg-amber-600', ring: 'ring-amber-200' },
  { fill: '#475569', bg: 'bg-slate-600', ring: 'ring-slate-200' },
];

export interface ModalityComparisonChartProps {
  categories: ModalityCategoryReport[];
}

/**
 * Comparative SVG bar chart: total published offers vs accepted offers per care modality.
 */
export function ModalityComparisonChart({
  categories,
}: Readonly<ModalityComparisonChartProps>) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!categories.length) {
    return (
      <EmptyState
        compact
        icon={<BarChart3 className="h-5 w-5" aria-hidden />}
        title="Sin categorías disponibles"
        description="No se encontraron métricas para los filtros aplicados."
      />
    );
  }

  const maxOffers = Math.max(
    1,
    ...categories.map((c) => Math.max(c.totalOffers, c.acceptedOffers)),
  );

  const width = 520;
  const height = 250;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 24;
  const padBottom = 56;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const groupW = plotW / categories.length;
  const barW = 28;
  const gap = 8;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: Math.round(maxOffers * ratio),
    y: padTop + plotH - ratio * plotH,
  }));

  const highlighted =
    activeIndex !== null && categories[activeIndex]
      ? categories[activeIndex]
      : categories[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-400" aria-hidden />
            Oferta (Total ofertas)
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-teal-600" aria-hidden />
            Demanda cubierta (Aceptadas)
          </span>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-700 tabular-nums">
          <span className="font-sans font-semibold text-slate-900">
            {getModalityLabel(highlighted)}:
          </span>{' '}
          {highlighted.acceptedOffers}/{highlighted.totalOffers} (
          {highlighted.fulfillmentRate.toFixed(1)}%)
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Gráfico comparativo entre total de ofertas y demanda cubierta por modalidad"
          className="h-auto min-w-[380px] w-full select-none"
        >
          {yTicks.map((tick) => (
            <g key={tick.ratio}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={tick.y}
                y2={tick.y}
                stroke={tick.ratio === 0 ? '#cbd5e1' : '#f1f5f9'}
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-400 font-mono text-[10px]"
              >
                {tick.value}
              </text>
            </g>
          ))}

          {categories.map((cat, idx) => {
            const centerX = padLeft + idx * groupW + groupW / 2;
            const totalH = (cat.totalOffers / maxOffers) * plotH;
            const acceptedH = (cat.acceptedOffers / maxOffers) * plotH;
            const totalX = centerX - barW - gap / 2;
            const acceptedX = centerX + gap / 2;
            const totalY = padTop + plotH - totalH;
            const acceptedY = padTop + plotH - acceptedH;
            const isActive = activeIndex === idx;
            const label = getModalityLabel(cat);
            const shortLabel =
              label.length > 20 ? `${label.slice(0, 18)}…` : label;

            return (
              <g
                key={cat.category}
                tabIndex={0}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(idx)}
                onBlur={() => setActiveIndex(null)}
                aria-label={`${label}: ${cat.totalOffers} ofertas totales, ${cat.acceptedOffers} ofertas aceptadas`}
                className="cursor-pointer outline-none"
              >
                {isActive ? (
                  <rect
                    x={centerX - groupW * 0.4}
                    y={padTop}
                    width={groupW * 0.8}
                    height={plotH}
                    rx={6}
                    fill="#f0fdfa"
                  />
                ) : null}

                <rect
                  x={totalX}
                  y={totalY}
                  width={barW}
                  height={Math.max(totalH, cat.totalOffers > 0 ? 3 : 0)}
                  rx={4}
                  fill={isActive ? '#64748b' : '#94a3b8'}
                />
                <rect
                  x={acceptedX}
                  y={acceptedY}
                  width={barW}
                  height={Math.max(acceptedH, cat.acceptedOffers > 0 ? 3 : 0)}
                  rx={4}
                  fill={isActive ? '#0f766e' : '#0d9488'}
                />

                <text
                  x={totalX + barW / 2}
                  y={Math.max(14, totalY - 5)}
                  textAnchor="middle"
                  className="fill-slate-600 font-mono text-[10px] font-medium"
                >
                  {cat.totalOffers}
                </text>
                <text
                  x={acceptedX + barW / 2}
                  y={Math.max(14, acceptedY - 5)}
                  textAnchor="middle"
                  className="fill-teal-700 font-mono text-[10px] font-semibold"
                >
                  {cat.acceptedOffers}
                </text>

                <text
                  x={centerX}
                  y={padTop + plotH + 18}
                  textAnchor="middle"
                  className="fill-slate-700 text-[11px] font-medium"
                >
                  {shortLabel}
                </text>
                <text
                  x={centerX}
                  y={padTop + plotH + 34}
                  textAnchor="middle"
                  className="fill-teal-700 font-mono text-[10px]"
                >
                  {cat.fulfillmentRate.toFixed(1)}% cumpl.
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export interface MarketShareDonutChartProps {
  categories: ModalityCategoryReport[];
  totalOffers: number;
  totalAcceptedServices: number;
}

/**
 * Clean SVG Donut Chart visualizing marketSharePercentage across care modalities.
 */
export function MarketShareDonutChart({
  categories,
  totalOffers,
  totalAcceptedServices,
}: Readonly<MarketShareDonutChartProps>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!categories.length) {
    return (
      <EmptyState
        compact
        icon={<PieChart className="h-5 w-5" aria-hidden />}
        title="Sin participación registrada"
        description="Ajusta los filtros de fecha o ciudad para explorar la distribución."
      />
    );
  }

  const radius = 66;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  const segments = categories.reduce<
    Array<{
      cat: ModalityCategoryReport;
      label: string;
      share: number;
      dashLength: number;
      offset: number;
      color: (typeof SLICE_PALETTE)[number];
      index: number;
    }>
  >((acc, cat, index) => {
    const share = Math.max(0, Math.min(100, cat.marketSharePercentage));
    const dashLength = (share / 100) * circumference;
    const prevUsed = acc.reduce((sum, item) => sum + item.dashLength, 0);
    acc.push({
      cat,
      label: getModalityLabel(cat),
      share,
      dashLength,
      offset: -prevUsed,
      color: SLICE_PALETTE[index % SLICE_PALETTE.length],
      index,
    });
    return acc;
  }, []);

  const hasVolume = totalOffers > 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex shrink-0 items-center justify-center">
        <svg
          width="184"
          height="184"
          viewBox="0 0 184 184"
          role="img"
          aria-label="Distribución porcentual de mercado por modalidad de cuidado"
          className="-rotate-90"
        >
          <circle
            cx="92"
            cy="92"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {hasVolume
            ? segments.map((seg) => {
                if (seg.dashLength <= 0) return null;
                const isHovered = hoveredIndex === seg.index;
                return (
                  <circle
                    key={seg.cat.category}
                    cx="92"
                    cy="92"
                    r={radius}
                    fill="none"
                    stroke={seg.color.fill}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${seg.dashLength} ${circumference}`}
                    strokeDashoffset={seg.offset}
                    strokeLinecap="butt"
                    className="cursor-pointer transition-[stroke-width] duration-150"
                    onMouseEnter={() => setHoveredIndex(seg.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })
            : null}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Ofertas
          </span>
          <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {totalOffers}
          </span>
          <span className="font-mono text-[11px] font-medium text-teal-700 tabular-nums">
            {totalAcceptedServices} cubiertas
          </span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-2.5">
        {segments.map((seg) => {
          const isHovered = hoveredIndex === seg.index;
          return (
            <li
              key={seg.cat.category}
              onMouseEnter={() => setHoveredIndex(seg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-xs transition-colors ${
                isHovered
                  ? 'border-teal-300 bg-teal-50/60'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ${seg.color.bg}`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {seg.label}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {seg.cat.totalOffers} ofertas · {seg.cat.availableCaregiversCount}{' '}
                    cuidadores
                  </p>
                </div>
              </div>

              <span className="shrink-0 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {seg.share.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
