import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from 'antd'
import {
  Button,
  DateTimePicker,
  Input,
  Select,
  type SelectOption
} from '@/components/atoms'
import type {
  FinalizeExamFormValues,
  FinalizeExamModalProps
} from './FinalizeExamModal.types'

interface FormErrors {
  courseId?: string
  durationMinutes?: string
  rateScore?: string
  startTime?: string
  endTime?: string
}

const defaultFormValues: FinalizeExamFormValues = {
  courseId: undefined,
  durationMinutes: undefined,
  startTime: null,
  endTime: null,
  rateScore: undefined
}

/**
 * Modal used to finalize scheduling details prior to saving an exam.
 */
export const FinalizeExamModal: React.FC<FinalizeExamModalProps> = ({
  open,
  loading = false,
  courseOptions,
  initialValues,
  onClose,
  onSubmit
}) => {
  const [formValues, setFormValues] =
    useState<FinalizeExamFormValues>(defaultFormValues)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (open) {
      setFormValues((prev) => ({
        ...prev,
        ...defaultFormValues,
        ...initialValues
      }))
      setErrors({})
    }
  }, [open, initialValues])

  const handleFieldChange = <K extends keyof FinalizeExamFormValues>(
    key: K,
    value: FinalizeExamFormValues[K]
  ) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const validate = (): boolean => {
    const nextErrors: FormErrors = {}

    if (!formValues.courseId) {
      nextErrors.courseId = 'Course is required'
    }

    if (formValues.durationMinutes === undefined) {
      nextErrors.durationMinutes = 'Duration is required'
    } else if (Number.isNaN(formValues.durationMinutes)) {
      nextErrors.durationMinutes = 'Duration must be a number'
    } else if (formValues.durationMinutes <= 0) {
      nextErrors.durationMinutes = 'Duration must be greater than 0'
    }

    if (formValues.rateScore === undefined) {
      nextErrors.rateScore = 'Passing score is required'
    } else if (Number.isNaN(formValues.rateScore)) {
      nextErrors.rateScore = 'Passing score must be a number'
    } else if (formValues.rateScore < 0 || formValues.rateScore > 100) {
      nextErrors.rateScore = 'Passing score must be between 0 and 100'
    }

    if (!formValues.startTime) {
      nextErrors.startTime = 'Start time is required'
    }

    if (!formValues.endTime) {
      nextErrors.endTime = 'End time is required'
    }

    if (formValues.startTime && formValues.endTime) {
      if (formValues.startTime.isAfter(formValues.endTime)) {
        nextErrors.endTime = 'End time must be after start time'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    const payload: FinalizeExamFormValues = {
      ...formValues,
      durationMinutes: formValues.durationMinutes,
      rateScore: formValues.rateScore
    }

    onSubmit(payload)
  }

  const courseSelectOptions: SelectOption[] = useMemo(
    () => courseOptions,
    [courseOptions]
  )

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={520}
      maskClosable={!loading}
      className="max-w-full px-4"
    >
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Finalize and Schedule Exam
          </h2>
          <p className="text-sm text-slate-500">
            Fill in the details below to create and schedule the exam.
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="course-name"
            >
              Course Name
            </label>
            <Select
              id="course-name"
              placeholder="Select a course"
              value={formValues.courseId}
              onChange={(value) =>
                handleFieldChange('courseId', value as string | undefined)
              }
              options={courseSelectOptions}
              className="!h-12"
            />
            {errors.courseId && (
              <span className="text-xs text-red-500">{errors.courseId}</span>
            )}
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="duration"
            >
              Duration (in minutes)
            </label>
            <Input
              id="duration"
              placeholder="e.g., 120"
              value={formValues.durationMinutes?.toString() ?? ''}
              onChange={(value) =>
                handleFieldChange(
                  'durationMinutes',
                  value ? Number(value) : undefined
                )
              }
              error={errors.durationMinutes}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="rate-score"
            >
              Passing Score (%)
            </label>
            <Input
              id="rate-score"
              placeholder="e.g., 70"
              value={formValues.rateScore?.toString() ?? ''}
              onChange={(value) =>
                handleFieldChange(
                  'rateScore',
                  value ? Number(value) : undefined
                )
              }
              error={errors.rateScore}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="start-time"
              >
                Start Time
              </label>
              <DateTimePicker
                value={formValues.startTime ?? null}
                onChange={(date) => handleFieldChange('startTime', date)}
                placeholder="mm/dd/yyyy --:-- --"
              />
              {errors.startTime && (
                <span className="text-xs text-red-500">{errors.startTime}</span>
              )}
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="end-time"
              >
                End Time
              </label>
              <DateTimePicker
                value={formValues.endTime ?? null}
                onChange={(date) => handleFieldChange('endTime', date)}
                placeholder="mm/dd/yyyy --:-- --"
              />
              {errors.endTime && (
                <span className="text-xs text-red-500">{errors.endTime}</span>
              )}
            </div>
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
            Save &amp; Schedule
          </Button>
        </div>
      </div>
    </Modal>
  )
}
