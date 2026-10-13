export interface EngagementDuration {
  startDate: string;
  endDate: string;
  durationDays: number;
  durationFormatted: string;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED';
}

export function computeEngagementDuration(
  startDateStr: string,
  endDateStr: string,
  currentDate: Date = new Date(),
): EngagementDuration {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const diffTime = end.getTime() - start.getTime();
  const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  let durationFormatted: string;
  if (durationDays === 1) {
    durationFormatted = '1 day';
  } else if (durationDays < 30) {
    durationFormatted = `${durationDays} days`;
  } else {
    const months = Math.floor(durationDays / 30);
    const remDays = durationDays % 30;
    if (remDays === 0) {
      durationFormatted = `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const daySuffix = remDays === 1 ? 'day' : 'days';
      durationFormatted = `${months} month${months > 1 ? 's' : ''} ${remDays} ${daySuffix}`;
    }
  }

  const todayStr = currentDate.toISOString().split('T')[0];
  let status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED';
  if (todayStr < startDateStr) {
    status = 'SCHEDULED';
  } else if (todayStr > endDateStr) {
    status = 'COMPLETED';
  } else {
    status = 'ONGOING';
  }

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    durationDays,
    durationFormatted,
    status,
  };
}
