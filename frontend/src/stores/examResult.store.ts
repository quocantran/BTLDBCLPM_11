// src/stores/examResult.store.ts
import { create } from 'zustand';
import type { SubmissionResult } from '@/app/(privateLayout)/dashboard/student/exams/types/exam.types';

interface ExamResultState {
  result: SubmissionResult | null;
  setResult: (result: SubmissionResult) => void;
  clearResult: () => void;
}

export const useExamResultStore = create<ExamResultState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clearResult: () => set({ result: null }),
}));