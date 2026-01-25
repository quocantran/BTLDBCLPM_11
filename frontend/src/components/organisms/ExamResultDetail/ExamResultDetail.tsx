'use client'

import React, { useMemo } from 'react'
import { Card, Col, Row, Tag, Typography } from 'antd'
import { Badge } from '@/components/atoms'
import type { ExamResultDetailEntity } from '@/services/api/exam.api'

const { Title, Text } = Typography

export interface ExamResultDetailProps {
  detail: ExamResultDetailEntity
  isTeacherView?: boolean
}

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return value
  }
}

export const ExamResultDetail: React.FC<ExamResultDetailProps> = ({
  detail,
  isTeacherView = false
}) => {
  const { exam, metrics, questions, student } = detail

  const passBadgeVariant = metrics.passed ? 'success' : 'danger'
  const passBadgeLabel = metrics.passed ? 'Passed' : 'Failed'

  const summaryCards = useMemo(
    () => (
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card className="rounded-3xl border border-slate-200 shadow-sm h-full">
            <div className="space-y-3">
              <Text type="secondary">Exam</Text>
              <Title level={4} className="!m-0">
                {exam.examTitle}
              </Title>
              <div>
                <Text className="block text-sm text-slate-500">Course</Text>
                <Text strong>{exam.courseName}</Text>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>Submitted</span>
                <span className="font-medium text-slate-900">
                  {formatDate(exam.submittedAt)}
                </span>
              </div>
              <div className="text-sm text-slate-500">
                Exam Code:{' '}
                <span className="font-mono">{exam.examPublicId}</span>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="rounded-3xl border border-slate-200 shadow-sm h-full">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text type="secondary">Final Score</Text>
                  <Title level={3} className="!m-0">
                    {metrics.score.toFixed(1)}%
                  </Title>
                </div>
                <Badge label={passBadgeLabel} variant={passBadgeVariant} />
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <Text type="secondary" className="block text-xs uppercase">
                    Correct Answers
                  </Text>
                  <Text className="font-semibold text-slate-900">
                    {metrics.correctAnswers}/{metrics.totalQuestions}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" className="block text-xs uppercase">
                    Passing Score
                  </Text>
                  <Text className="font-semibold text-slate-900">
                    {exam.rateScore}%
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    ),
    [exam, metrics, passBadgeLabel, passBadgeVariant]
  )

  return (
    <div className="space-y-6">
      {summaryCards}

      {isTeacherView && student ? (
        <Card className="rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Text type="secondary">Student</Text>
              <Title level={4} className="!m-0">
                {student.studentName}
              </Title>
              <div className="text-sm text-slate-500">
                ID: <span className="font-mono">{student.studentCode}</span>
              </div>
            </div>
            {student.email ? (
              <div className="text-sm text-slate-500">
                <Text type="secondary" className="block text-xs uppercase">
                  Email
                </Text>
                <Text>{student.email}</Text>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-6">
          <div>
            <Title level={4} className="!m-0">
              Question Breakdown
            </Title>
            <Text type="secondary">
              Each option shows the selected answer and the correct answer.
            </Text>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => {
              const isCorrect = question.isCorrect
              return (
                <div
                  key={question.questionId}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm font-semibold text-slate-500">
                      Question {index + 1}
                    </div>
                    <Badge
                      label={isCorrect ? 'Correct' : 'Incorrect'}
                      variant={isCorrect ? 'success' : 'danger'}
                    />
                  </div>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {question.content}
                  </p>
                  <div className="mt-4 space-y-3">
                    {question.choices.map((choice) => {
                      const isSelected =
                        question.studentAnswer === choice.option
                      const highlight = choice.isCorrect
                        ? 'border-emerald-200 bg-emerald-50'
                        : isSelected
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-200'
                      return (
                        <div
                          key={`${question.questionId}-${choice.option}`}
                          className={`flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm md:flex-row md:items-center md:justify-between ${highlight}`}
                        >
                          <div>
                            <span className="mr-2 font-semibold text-slate-900">
                              {choice.option}.
                            </span>
                            <span>{choice.content}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {choice.isCorrect ? (
                              <Tag color="green">Correct answer</Tag>
                            ) : null}
                            {isSelected ? (
                              <Tag color={isCorrect ? 'blue' : 'red'}>
                                Your choice
                              </Tag>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ExamResultDetail
