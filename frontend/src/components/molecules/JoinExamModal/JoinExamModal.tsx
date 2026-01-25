// src/components/molecules/JoinExamModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { ExamService } from '@/services';
import type { JoinExamResponseDto } from '@/services/types/api.types';
import { isAxiosError } from 'axios';

interface JoinExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: (examData: JoinExamResponseDto) => void;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp: string;
}

export const JoinExamModal = ({ isOpen, onClose, onJoinSuccess }: JoinExamModalProps) => {
  const [examCode, setExamCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Cấu hình callbacks cho mutation
  const { mutate: joinExam, isPending } = ExamService.usePost<JoinExamResponseDto>(
    {
      // `url` này sẽ được nối với `EXAM_SERVICE_ENDPOINT`
      // (ví dụ: /exams) -> /exams/join
      url: '/join',
    },
    {
      // Cấu hình callbacks cho mutation
      onSuccess: (data) => {
        // data ở đây chính là JoinExamResponseDto
        onJoinSuccess(data);
        onClose();
      },
      onError: (err: unknown) => {
        if (isAxiosError<ApiErrorResponse>(err)) {
          // Extract message từ error.error.message
          const message = err.response?.data?.error?.message || 'An unknown error occurred.';
          setError(message);
          return;
        }
        // Fallback for non-Axios errors
        setError('An unexpected error occurred.');
      },
    }
  );

  // Reset form khi modal được mở
  useEffect(() => {
    if (isOpen) {
      setExamCode('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleJoinExam = () => {
    setError(null);
    joinExam({
      data: {
        publicId: examCode,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
    <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
    />

      {/* Modal Content */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
          <div className="p-8">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-[var(--dark-text)]">
                Join Exam
              </h2>
              <button
                onClick={onClose}
                className="text-[var(--medium-text)] hover:text-[var(--dark-text)] p-1 rounded-full hover:bg-gray-100"
                disabled={isPending} // Dùng isPending
              >
                <span className="material-symbols-outlined">Close</span>
              </button>
            </div>
            <div className="mt-6">
              <label
                htmlFor="exam-code"
                className="block text-sm font-medium text-[var(--medium-text)] mb-1"
              >
                Exam Code
              </label>
              <input
                type="text"
                name="exam-code"
                id="exam-code"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] sm:text-base p-3"
                placeholder="Enter the exam code (e.g., E123456)"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                disabled={isPending} // ⭐️ 7. Dùng isPending
              />
              {/* Hiển thị lỗi API */}
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>
          </div>
          <div className="bg-gray-50 px-8 py-4 flex justify-end gap-3 rounded-b-lg">
            <button
              onClick={onClose}
              className="btn-secondary px-6 py-2 text-sm font-semibold rounded-md shadow-sm"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleJoinExam}
              className="btn-primary !text-white px-6 py-2 text-sm font-semibold rounded-md shadow-sm disabled:opacity-50"
              disabled={isPending || examCode.length === 0}
            >
              {isPending ? 'Joining...' : 'Join Exam'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};