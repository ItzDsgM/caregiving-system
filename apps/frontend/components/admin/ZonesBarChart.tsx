'use client';

import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ZoneItemReport } from '@/lib/types';

export interface ZonesBarChartProps {
  zones: ZoneItemReport[];
}

function truncateZoneLabel(zone: string, city: string): string {
  const combined = `${zone}`;
  if (combined.length <= 13) return combined;
  return `${combined.slice(0, 12)}… (${city.slice(0, 3)})`;
}

/**
 * Zero-dependency responsive grouped SVG Bar Chart comparing published offers vs completed services per zone.
 */
export function ZonesBarChart({ zones }: Readonly<ZonesBarChartProps>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!zones || zones.length === 0) {
    return (
      <EmptyState
        compact
        icon={<MapPin className="h-5 w-5" aria-hidden />}
        title="Sin datos territoriales"
        description="Aún no hay ofertas registradas por ciudad y zona para graficar cobertura."
      />
    );
  }

  const maxMetric = Math.max(
    1,
    ...zones.map((z) => Math.max(z.totalOffers, z.completedServices)),
  );

  const chartWidth = 640;
  const chartHeight = 270;
  const padLeft = 42;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 64;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const groupWidth = plotWidth / zones.length;
  const barWidth = Math.min(20, Math.max(8, groupWidth * 0.28));
  const barGap = 4;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: Math.round(maxMetric * ratio),
    y: padTop + plotHeight - ratio * plotHeight,
  }));

  const activeZone =
    hoveredIndex !== null && zones[hoveredIndex]
      ? zones[hoveredIndex]
      : zones[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-400" aria-hidden />
            Total ofertas
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-teal-600" aria-hidden />
            Servicios contratados
          </span>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-700 tabular-nums">
          <span className="font-sans font-semibold text-slate-900">
            {activeZone.zone}, {activeZone.city}:
          </span>{' '}
          {activeZone.totalOffers} ofertas · {activeZone.completedServices} cubiertas (
          {activeZone.fulfillmentRate.toFixed(1)}%)
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label="Gráfico comparativo de ofertas publicadas y servicios contratados por zona"
          className="h-auto min-w-[460px] w-full select-none"
        >
          {/* Horizontal Gridlines */}
          {yTicks.map((tick) => (
            <g key={tick.ratio}>
              <line
                x1={padLeft}
                x2={chartWidth - padRight}
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

          {/* Grouped Bars */}
          {zones.map((zone, index) => {
            const centerX = padLeft + index * groupWidth + groupWidth / 2;
            const offersHeight = (zone.totalOffers / maxMetric) * plotHeight;
            const completedHeight = (zone.completedServices / maxMetric) * plotHeight;
            const offersX = centerX - barWidth - barGap / 2;
            const completedX = centerX + barGap / 2;
            const offersY = padTop + plotHeight - offersHeight;
            const completedY = padTop + plotHeight - completedHeight;
            const isActive = hoveredIndex === index;

            return (
              <g
                key={`${zone.city}-${zone.zone}-${zone.rank}`}
                tabIndex={0}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                aria-label={`${zone.zone}, ${zone.city}: ${zone.totalOffers} ofertas, ${zone.completedServices} servicios contratados`}
                className="cursor-pointer outline-none"
              >
                {isActive ? (
                  <rect
                    x={centerX - groupWidth * 0.42}
                    y={padTop}
                    width={groupWidth * 0.84}
                    height={plotHeight}
                    rx={6}
                    fill="#f0fdfa"
                  />
                ) : null}

                {/* Total Offers Bar */}
                <rect
                  x={offersX}
                  y={offersY}
                  width={barWidth}
                  height={Math.max(offersHeight, zone.totalOffers > 0 ? 3 : 0)}
                  rx={3}
                  fill={isActive ? '#64748b' : '#94a3b8'}
                />

                {/* Completed Services Bar */}
                <rect
                  x={completedX}
                  y={completedY}
                  width={barWidth}
                  height={Math.max(
                    completedHeight,
                    zone.completedServices > 0 ? 3 : 0,
                  )}
                  rx={3}
                  fill={isActive ? '#0f766e' : '#0d9488'}
                />

                {/* Top numeric readouts on active bar */}
                {isActive ? (
                  <>
                    <text
                      x={offersX + barWidth / 2}
                      y={Math.max(12, offersY - 4)}
                      textAnchor="middle"
                      className="fill-slate-700 font-mono text-[10px] font-semibold"
                    >
                      {zone.totalOffers}
                    </text>
                    <text
                      x={completedX + barWidth / 2}
                      y={Math.max(12, completedY - 4)}
                      textAnchor="middle"
                      className="fill-teal-700 font-mono text-[10px] font-semibold"
                    >
                      {zone.completedServices}
                    </text>
                  </>
                ) : null}

                {/* Zone + City X labels */}
                <text
                  x={centerX}
                  y={padTop + plotHeight + 16}
                  textAnchor="middle"
                  className={`text-[10px] font-medium ${
                    isActive ? 'fill-slate-900 font-semibold' : 'fill-slate-600'
                  }`}
                >
                  {truncateZoneLabel(zone.zone, zone.city)}
                </text>
                <text
                  x={centerX}
                  y={padTop + plotHeight + 29}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px]"
                >
                  {zone.city}
                </text>
                <text
                  x={centerX}
                  y={padTop + plotHeight + 43}
                  textAnchor="middle"
                  className="fill-teal-700 font-mono text-[9px]"
                >
                  {zone.fulfillmentRate.toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
