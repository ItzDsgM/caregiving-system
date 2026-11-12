'use client';

import React, { useId, useState } from 'react';
import { Star } from 'lucide-react';
import { ApiError, reviewsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { RatingStars } from '@/components/ui/RatingStars';
import { InlineErrorAlert, resolveClientErrorMessage } from './ClientUiHelpers';
import { markCaregiverReviewed, type StoredReviewRecord } from './storage';

export const REVIEW_COMMENT_MIN = 15;
export const REVIEW_COMMENT_MAX = 500;

export interface ReviewFormProps {
  caregiverId: string;
  onSuccess: (record: StoredReviewRecord) => void;
  onAlreadyReviewed?: (record: StoredReviewRecord) => void;
  onError?: (message: string) => void;
  cancelAction?: React.ReactNode;
  isDisabled?: boolean;
}

export function ReviewForm({
  caregiverId,
  onSuccess,
  onAlreadyReviewed,
  onError,
  cancelAction,
  isDisabled = false,
}: Readonly<ReviewFormProps>) {
  const { user } = useAuth();
  const commentId = useId();
  const hintId = useId();

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const [submittedAttempt, setSubmittedAttempt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const trimmedComment = comment.trim();
  const showValidation = touched || submittedAttempt;

  const ratingError =
    submittedAttempt && (rating < 1 || rating > 5)
      ? 'Selecciona una calificación entre 1 y 5 estrellas.'
      : null;

  const commentError =
    showValidation && trimmedComment.length < REVIEW_COMMENT_MIN
      ? `El comentario debe tener al menos ${REVIEW_COMMENT_MIN} caracteres.`
      : showValidation && trimmedComment.length > REVIEW_COMMENT_MAX
        ? `El comentario no puede superar los ${REVIEW_COMMENT_MAX} caracteres.`
        : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedAttempt(true);
    setApiError(null);

    if (
      isDisabled ||
      rating < 1 ||
      rating > 5 ||
      trimmedComment.length < REVIEW_COMMENT_MIN ||
      trimmedComment.length > REVIEW_COMMENT_MAX
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await reviewsApi.create(caregiverId, {
        rating,
        comment: trimmedComment,
      });

      const record: StoredReviewRecord = {
        rating: created.rating ?? rating,
        createdAt: created.createdAt || new Date().toISOString(),
      };

      markCaregiverReviewed(user?.id, caregiverId, record);
      onSuccess(record);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        const record: StoredReviewRecord = {
          rating,
          createdAt: new Date().toISOString(),
        };
        markCaregiverReviewed(user?.id, caregiverId, record);
        const conflictMsg =
          'Ya enviaste una reseña anteriormente para este cuidador. El sistema permite una sola reseña por relación profesional.';
        setApiError(conflictMsg);
        onAlreadyReviewed?.(record);
      } else {
        const msg = resolveClientErrorMessage(
          err,
          'No se pudo publicar tu reseña. Verifica los datos e intenta nuevamente.',
        );
        setApiError(msg);
        onError?.(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <InlineErrorAlert
        message={apiError}
        title="No pudimos publicar tu reseña"
      />

      <div>
        <span className="block text-sm font-medium text-slate-900">
          Calificación general
        </span>
        <p className="mt-0.5 text-xs text-slate-500">
          Usa el teclado (flechas o teclas 1–5) o haz clic sobre las estrellas.
        </p>
        <div className="mt-2.5 flex items-center gap-3">
          <RatingStars
            interactive
            value={rating}
            onChange={(next) => {
              setRating(next);
              if (apiError) setApiError(null);
            }}
            size="lg"
            ariaLabel="Calificación del servicio"
          />
        </div>
        {ratingError ? (
          <p className="mt-1.5 text-xs font-medium text-rose-600">
            {ratingError}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={commentId}
            className="block text-sm font-medium text-slate-900"
          >
            Comentario sobre la atención
          </label>
          <span
            className={`font-mono text-xs tabular-nums ${
              trimmedComment.length >= REVIEW_COMMENT_MIN
                ? 'text-teal-700'
                : 'text-slate-500'
            }`}
          >
            {trimmedComment.length}/{REVIEW_COMMENT_MAX}
          </span>
        </div>

        <textarea
          id={commentId}
          rows={4}
          required
          minLength={REVIEW_COMMENT_MIN}
          maxLength={REVIEW_COMMENT_MAX}
          value={comment}
          disabled={isSubmitting || isDisabled}
          aria-invalid={Boolean(commentError) || undefined}
          aria-describedby={hintId}
          onChange={(event) => {
            setComment(event.target.value);
            if (apiError) setApiError(null);
          }}
          onBlur={() => setTouched(true)}
          placeholder="Describe la puntualidad, trato al paciente, comunicación y cumplimiento de los horarios..."
          className="mt-2 block w-full rounded-[8px] border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:bg-slate-50"
        />

        <p
          id={hintId}
          className={`mt-1.5 text-xs ${
            commentError ? 'font-medium text-rose-600' : 'text-slate-500'
          }`}
        >
          {commentError ??
            `Mínimo ${REVIEW_COMMENT_MIN} caracteres (máximo ${REVIEW_COMMENT_MAX}).`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
        {cancelAction}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isDisabled}
          loading={isSubmitting}
          loadingText="Publicando..."
          leftIcon={<Star className="h-4 w-4" aria-hidden />}
        >
          Publicar Reseña
        </Button>
      </div>
    </form>
  );
}
