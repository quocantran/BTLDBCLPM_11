import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from 'antd'
import {
  Button,
  DateTimePicker,
  Input,
  Select,
  Textarea,
  type SelectOption
} from '@/components/atoms'
import type {
  CreateCourseFormValues,
  CreateCourseModalProps
} from './CreateCourseModal.types'

interface FormErrors {
  title?: string
  code?: string
  endDate?: string
}

const defaultFormValues: CreateCourseFormValues = {
  title: '',
  code: '',
  category: undefined,
  level: undefined,
  startDate: null,
  endDate: null,
  instructor: '',
  description: ''
}

/**
 * Modal used to collect core course information before persisting it.
 */
export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({
  open,
  loading = false,
  // categoryOptions,
  // levelOptions,
  initialValues,
  onClose,
  onSubmit
}) => {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTitle(initialValues?.title ?? '')
      setError(null)
    }
  }, [open, initialValues])

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('Course title is required')
      return
    }
    void onSubmit({ title: title.trim() } as any)
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={560}
      maskClosable={!loading}
      className="max-w-full px-4"
    >
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Create A New Course
          </h2>
          <p className="text-sm text-slate-500">
            Provide the details below so you can save and publish the course
            later.
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="course-title"
            >
              Course Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="course-title"
              value={title}
              placeholder="e.g., Introduction to Data Science"
              onChange={setTitle}
              disabled={loading}
            />
            {error ? (
              <span className="text-xs text-red-500">{error}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="sm:w-auto"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="sm:w-auto"
            onClick={handleSubmit}
            loading={loading}
          >
            Create course
          </Button>
        </div>
      </div>
    </Modal>
  )
}
