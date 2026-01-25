// src/components/molecules/ConfirmSubmitModal.tsx
'use client';

import { useEffect } from 'react';

interface ConfirmSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const ConfirmSubmitModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: ConfirmSubmitModalProps) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-xs text-center p-7">
          {/* Icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M12 18v.01M12 6v.01"
              ></path>
            </svg>
          </div>

          {/* Title */}
          <h2 className="mt-5 text-xl font-bold text-[var(--dark-text)]">
            Confirm Exam Submission
          </h2>

          {/* Description */}
          <p className="mt-2 text-sm text-[var(--medium-text)]">
            Are you sure you want to submit your exam? You will not be able to make
            any further changes.
          </p>

          {/* Buttons */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:gap-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary mt-2 w-full px-4 py-2.5 text-sm font-semibold rounded-md shadow-sm sm:mt-0 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="btn-primary w-full px-4 py-2.5 text-sm font-semibold rounded-md shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};