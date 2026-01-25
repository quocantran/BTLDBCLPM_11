'use client'

import { Result, Skeleton, Typography } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Icon } from '@/components/atoms'
import {
  useStudentSubmissionDetail,
  type ExamResultDetailEntity
} from '@/services/api/exam.api'
import { ExamResultDetail } from '@/components/organisms/ExamResultDetail'

const { Title, Text } = Typography

interface PageProps {
  params: { publicId: string }
}

const StudentExamResultPage: React.FC<PageProps> = ({ params }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('submissionId') ?? undefined

  const { data, isLoading, isError, refetch } = useStudentSubmissionDetail(
    submissionId,
    {
      refetchOnWindowFocus: false
    }
  )

  const detail: ExamResultDetailEntity | undefined = data?.data

  if (!submissionId) {
    return (
      <Result
        status="info"
        title="Missing submission context"
        subTitle="Use the Completed Exams tab to open a specific attempt."
        extra={
          <Button onClick={() => router.push('/dashboard/student/exams')}>
            Back to exams
          </Button>
        }
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Skeleton active paragraph={{ rows: 6 }} className="w-full max-w-3xl" />
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <Result
        status="error"
        title="Could not load your exam result"
        extra={
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => void refetch()}>
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/student/exams')}
            >
              Back to exams
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={3} className="!m-0">
            {detail.exam.examTitle}
          </Title>
          <Text type="secondary">
            Review every answer you submitted for this exam.
          </Text>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/student/exams')}
        >
          <span className="flex items-center gap-2">
            <Icon name="arrow-left" />
            Back to exams
          </span>
        </Button>
      </div>

      <ExamResultDetail detail={detail} />
    </div>
  )
}

export default StudentExamResultPage
