// src/components/molecules/ConfirmStartExamModal.tsx
'use client';

import type { Exam } from '@/app/(privateLayout)/dashboard/student/exams/types/exam.types';
import { useEffect } from 'react';

interface ConfirmStartExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  exam: Exam | null; // Cần thông tin của exam để hiển thị duration
}

export const ConfirmStartExamModal = ({
  isOpen,
  onClose,
  onConfirm,
  exam,
}: ConfirmStartExamModalProps) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen || !exam) {
    return null;
  }

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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm text-center p-8">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-10 w-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
          </div>

          {/* Title */}
          <h2 className="mt-5 text-2xl font-bold text-[var(--dark-text)]">
            Confirm Exam Start
          </h2>

          {/* Description */}
          <p className="mt-2 text-base text-[var(--medium-text)]">
            Are you sure you want to start this exam? You will have{' '}
            <strong className="text-[var(--dark-text)]">
              {exam.durationInMinutes} minutes
            </strong>{' '}
            to complete it. This action cannot be undone.
          </p>

          {/* Buttons */}
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={onClose}
              className="btn-secondary w-full px-6 py-2.5 text-sm font-semibold rounded-md shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary w-full px-6 py-2.5 text-sm font-semibold rounded-md shadow-sm"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    </>
  );
};