'use client'

import React from 'react'
import { App } from 'antd'
import { Button, Icon } from '@/components/atoms'
import type { CourseCardProps } from './CourseCard.types'

export const CourseCard: React.FC<CourseCardProps> = ({
  courseName,
  publicId,
  teacherName,
  teacherId,
  enrollmentCount,
  onDelete,
  isDeleting = false,
  onEdit,
  isEditing = false,
  onClick
}) => {
  const { message } = App.useApp()

  const handleCopyCourseId = () => {
    if (!publicId) return

    if (!navigator?.clipboard) {
      message.error('Clipboard access is not available in this browser.')
      return
    }

    navigator.clipboard
      .writeText(publicId)
      .then(() => message.success('Course ID copied to clipboard'))
      .catch(() => message.error('Failed to copy course ID'))
  }

  return (
    <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <header className="space-y-2">
        {/* Course name - clickable to view exams */}
        <h3
          className={`text-lg font-semibold text-slate-900 ${
            onClick
              ? 'cursor-pointer hover:text-blue-600 transition-colors'
              : ''
          }`}
          onClick={onClick}
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
          onKeyDown={
            onClick ? (e) => e.key === 'Enter' && onClick() : undefined
          }
        >
          {courseName}
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="truncate text-sm text-slate-500">
            Course ID:{' '}
            <span className="font-mono text-slate-600">{publicId}</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              size="small"
              className="sm:w-auto"
              onClick={handleCopyCourseId}
            >
              Copy ID
            </Button>
            {/* Edit button for updating course name */}
            {onEdit ? (
              <Button
                variant="outline"
                size="small"
                loading={isEditing}
                onClick={onEdit}
                className="sm:w-auto"
                aria-label="Edit course"
              >
                <span className="flex items-center gap-1">
                  <Icon name="pen" size="small" />
                  Edit
                </span>
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                variant="outline"
                size="small"
                loading={isDeleting}
                onClick={onDelete}
                className="sm:w-auto !border-red-200 !text-red-600 hover:!border-red-400 hover:!text-red-700 hover:!bg-red-50"
                aria-label="Delete course"
              >
                <span className="flex items-center gap-1">
                  <Icon name="trash" size="small" />
                  Delete
                </span>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <dl className="space-y-2 text-sm text-slate-600">
        <div className="flex items-start gap-2">
          <Icon
            name="dashboard"
            size="small"
            className="mt-0.5 text-blue-500"
          />
          <div>
            <dt className="font-medium text-slate-500">Teacher Name</dt>
            <dd className="text-slate-700">{teacherName}</dd>
            <p className="text-xs text-slate-500">ID: {teacherId}</p>
          </div>
        </div>
      </dl>

      {/* View Exams button - navigates to exams page filtered by this course */}
      {onClick ? (
        <div className="pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="small"
            className="w-full"
            onClick={onClick}
          >
            <span className="flex items-center justify-center gap-1">
              <Icon name="exam" size="small" />
              View Exams
            </span>
          </Button>
        </div>
      ) : null}
    </article>
  )
}
