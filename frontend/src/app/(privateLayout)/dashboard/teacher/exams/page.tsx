'use client'

import { useCallback, useMemo } from 'react'
import { App, Empty, Pagination, Spin, Tooltip } from 'antd'
import { Badge, Button, Icon, Input, Select } from '@/components/atoms'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDeleteExam, useExams } from '@/services/api/exam.api'
import { useTeacherCourses } from '@/services/api/course.api'
import { useAuth } from '@/stores/auth'
import { useExamFilters, type ExamStatusFilter } from '@/hooks'

type ExamStatus = 'active' | 'scheduled' | 'completed'

interface ExamRow {
  id: string
  code: string
  title?: string
  status: ExamStatus
  startTime: string
  endTime: string
  isEditable: boolean
  /** Course ID for this exam */
  courseId?: string
  /** Course name for display */
  courseName?: string
}

const statusFilterOptions = [
  { label: 'Status: All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Completed', value: 'completed' }
]

const statusVariantMap: Record<
  ExamStatus,
  'active' | 'scheduled' | 'completed'
> = {
  active: 'active',
  scheduled: 'scheduled',
  completed: 'completed'
}

const statusLabelMap: Record<ExamStatus, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  completed: 'Completed'
}

const normalizeStatus = (status: string): ExamStatus => {
  const normalized = status?.toLowerCase() as ExamStatus
  if (
    normalized === 'active' ||
    normalized === 'scheduled' ||
    normalized === 'completed'
  ) {
    return normalized
  }
  return 'scheduled'
}

const formatDateTime = (isoString: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoString))
  } catch (error) {
    void error
    return isoString
  }
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export default function ExamsPage() {
  const { message, modal } = App.useApp()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Get courseId from URL query params (passed from courses page)
  // This is only used for initial filter value when navigating from courses page
  const urlCourseId = searchParams.get('courseId')

  // Use the exam filters hook for state management (includes courseId filter)
  // Initialize with courseId from URL if present - after that, filter is controlled by user
  const {
    filters,
    setSearch,
    setStatus,
    setCourseId,
    setPage,
    setLimit,
    queryParams
  } = useExamFilters({
    limit: 10,
    // Set initial courseId from URL param, default to 'all' if not present
    courseId: urlCourseId || 'all'
  })

  /**
   * Handle course filter change from dropdown
   * Updates the filter state and clears URL param to prevent conflicts
   */
  const handleCourseChange = useCallback(
    (value: string | number | undefined) => {
      const newCourseId = (value ?? 'all') as string
      setCourseId(newCourseId)

      // Clear URL courseId param to prevent it from overriding user's filter choice
      // when they navigate back to this page
      if (urlCourseId) {
        router.replace('/dashboard/teacher/exams', { scroll: false })
      }
    },
    [setCourseId, urlCourseId, router]
  )

  // Fetch teacher's courses for the course filter dropdown
  const { data: coursesData } = useTeacherCourses(user?.id, undefined, {
    enabled: Boolean(user?.id),
    refetchOnWindowFocus: false
  })

  // Build course filter options with "All" option
  const courseFilterOptions = useMemo(() => {
    const courses = coursesData?.data.courses ?? []
    const options = [{ label: 'Course: All', value: 'all' }]
    courses.forEach((course) => {
      options.push({
        label: course.courseName,
        value: course.id
      })
    })
    return options
  }, [coursesData])

  const {
    data: examsResponse,
    isLoading,
    isFetching,
    isError,
    error,
    refetch
  } = useExams(user?.id ?? '', queryParams, {
    enabled: Boolean(user?.id),
    refetchOnWindowFocus: false
  })

  const deleteExamMutation = useDeleteExam({
    onSuccess: async () => {
      message.success('Exam deleted successfully')
      await refetch()
    },
    onError: (mutationError: unknown) => {
      const reason =
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to delete exam'
      message.error(reason)
    }
  })

  const exams = examsResponse?.data.exams ?? []
  const pagination = examsResponse?.data.pagination
  const isBusy = isLoading || isFetching

  // Map exams to rows with course info
  const examRows = useMemo<ExamRow[]>(() => {
    return exams.map((exam): ExamRow => {
      const normalizedStatus = normalizeStatus(exam.status)
      return {
        id: exam.id,
        code: exam.publicId,
        title: exam.title,
        status: normalizedStatus,
        startTime: formatDateTime(exam.startTime),
        endTime: formatDateTime(exam.endTime),
        isEditable: normalizedStatus === 'scheduled',
        courseId: exam.courseId,
        courseName: exam.courseName
      }
    })
  }, [exams])

  const handleCreateExam = () => {
    router.push('/dashboard/teacher/exams/create')
  }

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
    },
    [setSearch]
  )

  const handleStatusChange = useCallback(
    (value: string | number | undefined) => {
      setStatus((value ?? 'all') as ExamStatusFilter)
    },
    [setStatus]
  )

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      if (pageSize !== filters.limit) {
        setLimit(pageSize)
      } else {
        setPage(page)
      }
    },
    [filters.limit, setLimit, setPage]
  )

  const handleCopyExamCode = useCallback(
    (code: string) => {
      if (!code) {
        return
      }

      if (!navigator?.clipboard) {
        message.error('Clipboard access is not available in this browser.')
        return
      }

      navigator.clipboard
        .writeText(code)
        .then(() => message.success('Exam code copied to clipboard'))
        .catch(() => message.error('Failed to copy exam code'))
    },
    [message]
  )

  const handleDeleteExam = useCallback(
    (exam: ExamRow) => {
      modal.confirm({
        title: 'Delete exam',
        content: `This will permanently remove exam ${exam.code} regardless of its status. This action cannot be undone.`,
        okText: 'Delete',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        centered: true,
        onOk: async () => {
          await deleteExamMutation.mutateAsync({ examId: exam.id })
        }
      })
    },
    [deleteExamMutation, modal]
  )

  const renderEmptyState = () => {
    // Check if any filters are applied (including course filter)
    const hasFilters =
      filters.search || filters.status !== 'all' || filters.courseId !== 'all'

    if (hasFilters) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-slate-500">
              No exams match your search criteria. Try adjusting your filters.
            </span>
          }
        />
      )
    }

    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span className="text-slate-500">
            No exams found. Create your first exam to see it listed here.
          </span>
        }
      >
        <Button variant="primary" onClick={handleCreateExam}>
          Create Exam
        </Button>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Exams</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage and monitor all exams created within the platform.
          </p>
        </div>
        <Button
          size="medium"
          variant="primary"
          className="self-start md:self-auto"
          onClick={handleCreateExam}
        >
          + Create New Exam
        </Button>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-6 p-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <Input
                placeholder="Search by exam code or title..."
                prefix={<Icon name="search" />}
                value={filters.search}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
              {/* Course Filter Dropdown */}
              <Select
                value={filters.courseId}
                options={courseFilterOptions}
                onChange={handleCourseChange}
                className="min-w-[200px]"
              />
              {/* Status Filter Dropdown */}
              <Select
                value={filters.status}
                options={statusFilterOptions}
                onChange={handleStatusChange}
                className="min-w-[180px]"
              />
            </div>
          </div>

          {/* Loading State */}
          {isBusy && examRows.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <Spin tip="Loading exams..." />
            </div>
          ) : isError ? (
            /* Error State */
            <div className="space-y-3 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
              <p>Failed to load exams.</p>
              <button
                type="button"
                className="text-blue-600 underline"
                onClick={() => void refetch()}
              >
                Try again
              </button>
              {error instanceof Error ? (
                <p className="text-xs text-red-500">{error.message}</p>
              ) : null}
            </div>
          ) : examRows.length === 0 ? (
            /* Empty State */
            <div className="py-8">{renderEmptyState()}</div>
          ) : (
            /* Exams Table */
            <>
              <div
                className={`overflow-x-auto ${isFetching ? 'opacity-60' : ''}`}
              >
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th scope="col" className="px-4 py-3">
                        Exam Code
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Title
                      </th>
                      {/* Course column */}
                      <th scope="col" className="px-4 py-3">
                        Course
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Start Time
                      </th>
                      <th scope="col" className="px-4 py-3">
                        End Time
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {examRows.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-slate-900">
                              {exam.code}
                            </span>
                            <Tooltip title="Copy exam code">
                              <Button
                                size="small"
                                variant="outline"
                                className="!px-2"
                                onClick={() => handleCopyExamCode(exam.code)}
                                aria-label="Copy exam code"
                              >
                                Copy
                              </Button>
                            </Tooltip>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                          {exam.title || '-'}
                        </td>
                        {/* Course name cell */}
                        <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                          {exam.courseName || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            label={statusLabelMap[exam.status] ?? exam.status}
                            variant={statusVariantMap[exam.status] ?? 'default'}
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {exam.startTime}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {exam.endTime}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="small"
                              variant="outline"
                              className="!px-3"
                              onClick={() =>
                                router.push(
                                  `/dashboard/teacher/exams/${exam.code}`
                                )
                              }
                            >
                              View Details
                            </Button>
                            <Button
                              size="small"
                              variant="outline"
                              className="!px-3"
                              onClick={() =>
                                router.push(
                                  `/dashboard/teacher/exams/${exam.id}/results`
                                )
                              }
                            >
                              View Results
                            </Button>

                            <Button
                              size="small"
                              variant="outline"
                              className="!px-3"
                              onClick={() => {
                                router.push(
                                  `/dashboard/teacher/exams/create?examId=${exam.id}`
                                )
                              }}
                            >
                              Edit
                            </Button>
                            <Tooltip title="Delete exam">
                              <Button
                                size="small"
                                variant="outline"
                                className="!px-3 !text-red-600"
                                disabled={
                                  deleteExamMutation.isPending &&
                                  deleteExamMutation.variables?.examId ===
                                    exam.id
                                }
                                loading={
                                  deleteExamMutation.isPending &&
                                  deleteExamMutation.variables?.examId ===
                                    exam.id
                                }
                                onClick={() => handleDeleteExam(exam)}
                              >
                                Delete
                              </Button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <div className="text-sm text-slate-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{' '}
                    of {pagination.total} exams
                  </div>
                  <Pagination
                    current={pagination.page}
                    pageSize={pagination.limit}
                    total={pagination.total}
                    onChange={handlePageChange}
                    showSizeChanger
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    showQuickJumper={pagination.totalPages > 5}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
