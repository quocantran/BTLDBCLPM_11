'use client'

import React from 'react'
import { Card, Collapse, Tag, Typography, Empty } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { ExamQuestionEntity } from '@/services/api/exam.api'

const { Text } = Typography

export interface ExamQuestionsListProps {
  questions: ExamQuestionEntity[]
  className?: string
}

const ANSWER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export const ExamQuestionsList: React.FC<ExamQuestionsListProps> = ({
  questions,
  className = ''
}) => {
  if (!questions || questions.length === 0) {
    return (
      <Card
        className={`rounded-3xl border border-slate-200 shadow-sm ${className}`}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No questions available for this exam"
        />
      </Card>
    )
  }

  const collapseItems = questions.map((question, index) => {
    // answerQuestion is 1-based index from backend, convert to 0-based
    const correctAnswerIndex = question.answerQuestion - 1
    const correctAnswerLabel =
      ANSWER_LABELS[correctAnswerIndex] ?? question.answerQuestion

    return {
      key: question.id,
      label: (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Tag color="blue" className="!m-0">
              Q{index + 1}
            </Tag>
            <Text className="text-slate-900 line-clamp-1">
              {question.content}
            </Text>
          </div>
          <Tag color="green" className="!m-0 w-fit">
            Answer: {correctAnswerLabel}
          </Tag>
        </div>
      ),
      children: (
        <div className="space-y-3">
          <p className="text-base font-medium text-slate-900 mb-4">
            {question.content}
          </p>
          <div className="grid gap-2">
            {question.answer.map((ans, ansIndex) => {
              const isCorrect = ansIndex === correctAnswerIndex
              const label = ANSWER_LABELS[ansIndex] ?? ansIndex

              return (
                <div
                  key={`${question.id}-${ansIndex}`}
                  className={`
                    flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors
                    ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }
                  `}
                >
                  <span
                    className={`
                      flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold
                      ${
                        isCorrect
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }
                    `}
                  >
                    {label}
                  </span>
                  <span className="flex-1 text-slate-700">{ans.content}</span>
                  {isCorrect && (
                    <CheckCircleOutlined className="text-emerald-500 text-lg flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    }
  })

  return (
    <Card
      className={`rounded-3xl border border-slate-200 shadow-sm ${className}`}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Text strong className="text-lg text-slate-900">
              Questions ({questions.length})
            </Text>
            <Text type="secondary" className="block text-sm">
              Click on a question to view its answers
            </Text>
          </div>
        </div>

        <Collapse
          accordion
          items={collapseItems}
          className="exam-questions-collapse"
          expandIconPosition="end"
        />
      </div>
    </Card>
  )
}

export default ExamQuestionsList
