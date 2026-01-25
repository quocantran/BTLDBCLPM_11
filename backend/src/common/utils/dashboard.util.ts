import { computeExamStatus } from './exam.util';

type RawExamStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export type DashboardExamStatus = 'scheduled' | 'active' | 'completed';

export interface DashboardExamSnapshot {
  publicId: string;
  startTime: Date;
  endTime: Date;
  status: DashboardExamStatus;
}

export interface DashboardExamListItem {
  publicId: string;
  status: DashboardExamStatus;
  startTime: string;
}

export const DEFAULT_DASHBOARD_EXAM_LIMIT = 5;

/**
 * Convert an exam status from the database to the normalized dashboard variant.
 * The UI only understands scheduled | active | completed, so cancelled implicitly maps to completed.
 */
export function normalizeDashboardExamStatus(
  status: RawExamStatus,
): DashboardExamStatus {
  if (status === 'cancelled') {
    return 'completed';
  }

  return status as DashboardExamStatus;
}

/**
 * Compute the runtime dashboard status for an exam using the shared computeExamStatus helper
 * and normalize the status for dashboard consumption.
 */
export function resolveDashboardExamStatus(
  referenceDate: Date,
  startTime: Date,
  endTime: Date,
  status: RawExamStatus,
): DashboardExamStatus {
  const computed = computeExamStatus(referenceDate, startTime, endTime, status);
  return normalizeDashboardExamStatus(computed);
}

/**
 * Calculate the pass rate percentage with precision handling.
 */
export function calculatePassRate(
  passCount: number,
  totalAttempts: number,
  precision = 1,
): number {
  if (!totalAttempts || totalAttempts <= 0) {
    return 0;
  }

  const factor = 10 ** precision;
  return (
    Math.round(((passCount / totalAttempts) * 100 + Number.EPSILON) * factor) /
    factor
  );
}

/**
 * Build the dashboard list of exams prioritising ongoing/upcoming exams, with completed exams
 * appended as fallback when fewer than the requested limit are available.
 */
export function buildDashboardExamList(
  exams: DashboardExamSnapshot[],
  limit = DEFAULT_DASHBOARD_EXAM_LIMIT,
): DashboardExamListItem[] {
  if (!exams.length) {
    return [];
  }

  const upcoming = exams
    .filter((exam) => exam.status === 'scheduled' || exam.status === 'active')
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const completed = exams
    .filter((exam) => exam.status === 'completed')
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  const ordered = [...upcoming, ...completed].slice(0, limit);

  return ordered.map((exam) => ({
    publicId: exam.publicId,
    status: exam.status,
    startTime: exam.startTime.toISOString(),
  }));
}
