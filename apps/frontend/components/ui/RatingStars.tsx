'use client';

import React, { useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { toNumeric } from '@/lib/format';
import type { DecimalValue } from '@/lib/types';

export interface RatingStarsProps {
  rating?: DecimalValue | null;
  reviewCount?: number;
  interactive?: boolean;
  value?: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showNumeric?: boolean;
  ariaLabel?: string;
  className?: string;
}

const STAR_SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
};

export function RatingStars({
  rating,
  reviewCount,
  interactive = false,
  value = 0,
  onChange,
  size = 'md',
  showNumeric = true,
  ariaLabel = 'Calificación',
  className = '',
}: Readonly<RatingStarsProps>) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const numericValue = interactive
    ? Math.max(0, Math.min(5, Math.round(value)))
    : Math.max(0, Math.min(5, toNumeric(rating, 0)));

  const displayRating =
    interactive && hoveredRating !== null ? hoveredRating : numericValue;

  const starSize = STAR_SIZE_CLASSES[size];

  if (interactive) {
    const handleKeyDown = (
      event: React.KeyboardEvent<HTMLButtonElement>,
      starNumber: number,
    ) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next = Math.min(5, starNumber + 1);
        onChange?.(next);
        radioRefs.current[next - 1]?.focus();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        const prev = Math.max(1, starNumber - 1);
        onChange?.(prev);
        radioRefs.current[prev - 1]?.focus();
      } else if (/^[1-5]$/.test(event.key)) {
        event.preventDefault();
        const chosen = Number(event.key);
        onChange?.(chosen);
        radioRefs.current[chosen - 1]?.focus();
      }
    };

    return (
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        onMouseLeave={() => setHoveredRating(null)}
        className={`inline-flex items-center gap-1.5 ${className}`}
      >
        {[1, 2, 3, 4, 5].map((starNumber) => {
          const isFilled = starNumber <= displayRating;
          const isChecked = starNumber === numericValue;
          const isFocusable =
            numericValue > 0 ? isChecked : starNumber === 1;

          return (
            <button
              key={starNumber}
              ref={(el) => {
                radioRefs.current[starNumber - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isChecked}
              aria-label={`${starNumber} ${starNumber === 1 ? 'estrella' : 'estrellas'}`}
              tabIndex={isFocusable ? 0 : -1}
              onClick={() => onChange?.(starNumber)}
              onMouseEnter={() => setHoveredRating(starNumber)}
              onKeyDown={(event) => handleKeyDown(event, starNumber)}
              className="rounded-[6px] p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
            >
              <Star
                className={`${starSize} transition-colors ${
                  isFilled
                    ? 'fill-amber-400 text-amber-500'
                    : 'fill-transparent text-slate-300'
                }`}
                aria-hidden
              />
            </button>
          );
        })}
        {showNumeric && numericValue > 0 ? (
          <span className="tabular-nums ml-1 text-sm font-semibold text-slate-800">
            {numericValue}/5
          </span>
        ) : null}
      </div>
    );
  }

  const hasReviews =
    typeof reviewCount === 'number' ? reviewCount > 0 : numericValue > 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={
        hasReviews
          ? `${ariaLabel}: ${numericValue.toFixed(1)} de 5 estrellas`
          : `${ariaLabel}: sin reseñas todavía`
      }
    >
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((starNumber) => {
          const diff = numericValue - (starNumber - 1);
          const fillPercent = Math.max(0, Math.min(1, diff)) * 100;

          return (
            <span key={starNumber} className="relative inline-flex">
              <Star
                className={`${starSize} fill-transparent text-slate-300`}
                aria-hidden
              />
              {fillPercent > 0 ? (
                <span
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${fillPercent}%` }}
                >
                  <Star
                    className={`${starSize} fill-amber-400 text-amber-500`}
                    aria-hidden
                  />
                </span>
              ) : null}
            </span>
          );
        })}
      </div>

      {showNumeric ? (
        hasReviews ? (
          <span className="tabular-nums text-xs font-medium text-slate-700">
            <strong className="font-semibold text-slate-900">
              {numericValue.toFixed(1)}
            </strong>
            {typeof reviewCount === 'number' ? (
              <span className="text-slate-500"> ({reviewCount})</span>
            ) : null}
          </span>
        ) : (
          <span className="text-xs text-slate-500">Sin reseñas</span>
        )
      ) : null}
    </div>
  );
}
