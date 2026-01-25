'use client'

import { Result, Skeleton, Space, Typography } from 'antd'
import { useRouter } from 'next/navigation'
import { Button, Icon } from '@/components/atoms'
import {
  useTeacherSubmissionDetail,
  type ExamResultDetailEntity
} from '@/services/api/exam.api'
import { ExamResultDetail } from '@/components/organisms/ExamResultDetail'

const { Title, Text } = Typography

interface PageProps {
  params: { examId: string; submissionId: string }
}

const TeacherSubmissionDetailPage: React.FC<PageProps> = ({ params }) => {
  const router = useRouter()
  const { examId, submissionId } = params

  const { data, isLoading, isError, refetch } = useTeacherSubmissionDetail(
    examId,
    submissionId,
    {
      refetchOnWindowFocus: false
    }
  )

  const detail: ExamResultDetailEntity | undefined = data?.data

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Skeleton active paragraph={{ rows: 6 }} className="w-full max-w-4xl" />
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <Result
        status="error"
        title="Unable to load submission"
        subTitle="Please try again or return to the results table."
        extra={
          <Space wrap>
            <Button variant="primary" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/teacher/exams/${examId}/results`)
              }
            >
              Back to results
            </Button>
          </Space>
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
            Review {detail.student?.studentName ?? 'the student'}'s answers for
            this exam.
          </Text>
        </div>
        <Space wrap>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/dashboard/teacher/exams/${examId}/results`)
            }
          >
            <span className="flex items-center gap-2">
              <Icon name="arrow-left" />
              Back to results
            </span>
          </Button>
        </Space>
      </div>

      <ExamResultDetail detail={detail} isTeacherView />
    </div>
  )
}

export default TeacherSubmissionDetailPage
