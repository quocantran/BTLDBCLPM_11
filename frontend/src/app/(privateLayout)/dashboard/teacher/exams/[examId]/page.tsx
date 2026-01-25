'use client'

import { App, Empty, Spin } from 'antd'
import { useParams, useRouter } from 'next/navigation'
import { Badge, Button, Icon } from '@/components/atoms'
import { ExamQuestionsList } from '@/components/organisms'
import { useDeleteExam, useGetExam } from '@/services/api/exam.api'
import { useMemo } from 'react'

const formatDateTime = (isoString: string | Date) => {
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
    return String(isoString)
  }
}

const statusLabel: Record<string, string> = {
  scheduled: 'Scheduled',
  active: 'Active',
  completed: 'Completed'
}

const statusVariant: Record<string, 'scheduled' | 'active' | 'completed'> = {
  scheduled: 'scheduled',
  active: 'active',
  completed: 'completed'
}

export default function TeacherExamDetailPage() {
  const params = useParams<{ examId: string }>()
  const router = useRouter()
  const { message, modal } = App.useApp()

  const examIdentifier = useMemo(() => {
    if (!params?.examId) return ''
    return Array.isArray(params.examId) ? params.examId[0] : params.examId
  }, [params?.examId])

  const { data, isLoading, isFetching, isError, refetch } = useGetExam(
    examIdentifier,
    {
      enabled: Boolean(examIdentifier),
      refetchOnWindowFocus: false
    }
  )

  const deleteExamMutation = useDeleteExam({
    onSuccess: () => {
      message.success('Exam deleted successfully')
      router.push('/dashboard/teacher/exams')
    },
    onError: (mutationError: unknown) => {
      const reason =
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to delete exam'
      message.error(reason)
    }
  })

  const exam = data?.data.exam
  const busy = isLoading || isFetching

  const handleCopyCode = () => {
    if (!exam?.publicId) return
    if (!navigator?.clipboard) {
      message.error('Clipboard access is not available in this browser.')
      return
    }
    navigator.clipboard
      .writeText(exam.publicId)
      .then(() => message.success('Exam code copied'))
      .catch(() => message.error('Unable to copy exam code'))
  }

  const handleNavigateBack = () => {
    router.push('/dashboard/teacher/exams')
  }

  const handleEditExam = () => {
    if (!exam?.id) return
    router.push(`/dashboard/teacher/exams/create?examId=${exam.id}`)
  }

  const handleViewResults = () => {
    if (!exam?.id) return
    router.push(`/dashboard/teacher/exams/${exam.id}/results`)
  }

  const handleDeleteExam = () => {
    if (!exam?.id) return

    modal.confirm({
      title: 'Delete exam',
      content:
        'Deleting this exam removes all associated questions and submissions, even if the exam is active or completed. This action cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      centered: true,
      onOk: async () => {
        await deleteExamMutation.mutateAsync({ examId: exam.id })
      }
    })
  }

  if (!examIdentifier) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Empty description="No exam selected" />
      </div>
    )
  }

  if (busy) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    )
  }

  if (isError || !exam) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          Failed to load exam. Please try again.
        </div>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const readableStatus = statusLabel[exam.status] ?? exam.status
  const variant = statusVariant[exam.status] ?? 'scheduled'

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 !mb-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        onClick={handleNavigateBack}
      >
        <Icon name="arrow-left" size="small" />
        Back to exams
      </button>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Exam Code
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-2xl font-semibold text-slate-900">
                {exam.publicId ?? '—'}
              </span>
              <Button size="small" variant="outline" onClick={handleCopyCode}>
                Copy
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500">{exam.title}</p>
          </div>
          <Badge label={readableStatus} variant={variant} />
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Schedule
            </h3>
            <dl className="space-y-3 text-sm text-slate-600">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Starts
                </dt>
                <dd className="text-base text-slate-900">
                  {formatDateTime(exam.startTime)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Ends
                </dt>
                <dd className="text-base text-slate-900">
                  {formatDateTime(exam.endTime)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Duration
                </dt>
                <dd className="text-base text-slate-900">
                  {exam.durationMinutes} minutes
                </dd>
              </div>
            </dl>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Configuration
            </h3>
            <dl className="space-y-3 text-sm text-slate-600">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Course
                </dt>
                <dd className="text-base text-slate-900">{exam.courseId}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Passing score
                </dt>
                <dd className="text-base text-slate-900">{exam.rateScore}%</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Questions
                </dt>
                <dd className="text-base text-slate-900">
                  {exam.questions?.length ?? 0} question(s)
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-6 md:flex-row md:justify-end">
          <Button size="medium" variant="outline" onClick={handleEditExam}>
            Edit exam
          </Button>
          <Button size="medium" variant="primary" onClick={handleViewResults}>
            View results
          </Button>
          <Button
            size="medium"
            variant="outline"
            className="!text-red-600"
            loading={deleteExamMutation.isPending}
            onClick={handleDeleteExam}
          >
            Delete exam
          </Button>
        </div>
      </section>

      <ExamQuestionsList questions={exam.questions ?? []} />
    </div>
  )
}
