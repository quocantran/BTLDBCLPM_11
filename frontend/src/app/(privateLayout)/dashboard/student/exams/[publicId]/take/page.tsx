'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ExamService } from '@/services'
import { ConfirmSubmitModal } from '@/components/molecules/ConfirmSubmitModal/ConfirmSubmitModal'
import { QuestionNavigator } from '@/components/molecules/QuestionNavigator'
import { TimeUpModal } from '@/components/molecules/TimeUpModal'
import { SubmissionResult } from '../../types/exam.types'
import type { TakeExamQuestion, TakeExamResponse } from '../../types/exam.types'
import type { AxiosError } from 'axios'
import axios from 'axios'

type StudentAnswer = {
  questionId: string
  selectedChoiceIndex: number | null
}

interface ErrorResponse {
  message: string | string[]
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function TakeExamPage() {
  const params = useParams()
  const router = useRouter()
  const publicId = params.publicId as string

  // State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([])
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [isTimeUp, setIsTimeUp] = useState(false)

  // Ref để lưu answers mới nhất - tránh re-render timer
  const answersRef = useRef<StudentAnswer[]>([])
  const hasSubmittedRef = useRef(false)

  // Sync answersRef với state
  useEffect(() => {
    answersRef.current = studentAnswers
  }, [studentAnswers])

  // Hook để LẤY BÀI THI
  const {
    data: examData,
    isLoading: isExamLoading,
    error: examError
  } = ExamService.useGet<TakeExamResponse>({
    url: `/${publicId}/take`,
    options: {
      enabled: !!publicId,
      retry: false
    }
  })

  // Hook để NỘP BÀI THI
  const { mutate: submitExam, isPending: isSubmitting } =
    ExamService.usePost<SubmissionResult>(
      {
        url: `/${publicId}/submit`
      },
      {
        onSuccess: (data) => {
          router.push(
            `/dashboard/student/exams/${publicId}/result?submissionId=${data.submissionId}`
          )
        },
        onError: (error: unknown) => {
          if (axios.isAxiosError(error)) {
            const err = error as AxiosError<ErrorResponse>
            const message = err.response?.data?.message || 'Submission failed.'
            alert(`Error: ${Array.isArray(message) ? message.join(', ') : message}`)
          } else {
            alert('An unexpected error occurred.')
          }
          setIsSubmitModalOpen(false)
          setIsTimeUp(false)
          hasSubmittedRef.current = false
        }
      }
    )

  // Hàm submit - sử dụng ref để lấy answers mới nhất
  const performSubmit = useCallback(() => {
    if (hasSubmittedRef.current) return
    hasSubmittedRef.current = true

    const currentAnswers = answersRef.current
    const payloadAnswers = currentAnswers
      .filter((ans) => ans.selectedChoiceIndex !== null)
      .map((ans) => ({
        questionId: ans.questionId,
        answerNumber: ans.selectedChoiceIndex! + 1
      }))

    submitExam({
      data: {
        answers: payloadAnswers
      }
    })
  }, [submitExam])

  // Khởi tạo đáp án khi có examData
  useEffect(() => {
    if (examData) {
      const initialAnswers = examData.questions.map((q) => ({
        questionId: q.questionId,
        selectedChoiceIndex: null
      }))
      setStudentAnswers(initialAnswers)
      answersRef.current = initialAnswers

      // Khởi tạo timer
      if (examData.durationMinutes) {
        setRemainingTime(examData.durationMinutes * 60)
      }
    }
  }, [examData])

  // Timer tick - không có dependency trên studentAnswers
  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0 || isTimeUp) {
      return
    }

    const timerId = setInterval(() => {
      setRemainingTime((prevTime) => {
        if (prevTime === null || prevTime <= 1) {
          clearInterval(timerId)
          setIsTimeUp(true)
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => clearInterval(timerId)
  }, [remainingTime, isTimeUp])

  // Auto-submit khi hết giờ
  useEffect(() => {
    if (isTimeUp && !hasSubmittedRef.current) {
      // Delay nhỏ để modal hiển thị trước
      const timer = setTimeout(() => {
        performSubmit()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isTimeUp, performSubmit])

  // Handler cho manual submit
  const handleManualSubmit = useCallback(() => {
    hasSubmittedRef.current = true
    const currentAnswers = answersRef.current
    const payloadAnswers = currentAnswers
      .filter((ans) => ans.selectedChoiceIndex !== null)
      .map((ans) => ({
        questionId: ans.questionId,
        answerNumber: ans.selectedChoiceIndex! + 1
      }))

    submitExam({
      data: {
        answers: payloadAnswers
      }
    })
  }, [submitExam])

  // Handler for question navigation
  const handleQuestionClick = (index: number) => {
    if (!isTimeUp) {
      setCurrentQuestionIndex(index)
    }
  }

  // Loading state
  if (isExamLoading) {
    return <div className="p-8 text-center">Loading exam...</div>
  }

  // Error state
  if (examError) {
    return (
      <div className="p-8 text-center text-red-600">
        <h2 className="text-xl font-bold">Error loading exam</h2>
        <p>{(examError as any).message || 'An unknown error occurred.'}</p>
      </div>
    )
  }

  // No data state
  if (!examData) {
    return <div className="p-8 text-center">No exam data found.</div>
  }

  const currentQuestion: TakeExamQuestion = examData.questions[currentQuestionIndex]
  const totalQuestions = examData.questions.length

  const handleSelectChoice = (choiceIndex: number) => {
    if (isTimeUp) return // Lock khi hết giờ
    
    const newAnswers = [...studentAnswers]
    newAnswers[currentQuestionIndex].selectedChoiceIndex = choiceIndex
    setStudentAnswers(newAnswers)
  }

  const goToNext = () => {
    if (currentQuestionIndex < totalQuestions - 1 && !isTimeUp) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (currentQuestionIndex > 0 && !isTimeUp) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  // Check if UI should be locked
  const isLocked = isTimeUp || isSubmitting

  return (
    <>
      <div className={`flex justify-center py-12 px-4 ${isLocked ? 'pointer-events-none opacity-75' : ''}`}>
        {/* Main Container with responsive layout */}
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
          
          {/* Left Column - Question Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h1 className="text-2xl font-bold text-center text-[var(--dark-text)]">
                {examData.title}
              </h1>
              <p className="text-center text-sm text-[var(--medium-text)] mt-1">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>

              {/* Timer */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-[var(--medium-text)] mb-1">
                  <span>Time Remaining:</span>
                  <span className={`font-bold text-base ${
                    remainingTime !== null && remainingTime <= 60 
                      ? 'text-red-500 animate-pulse' 
                      : 'text-[var(--primary-color)]'
                  }`}>
                    {remainingTime !== null ? formatTime(remainingTime) : '...'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      remainingTime !== null && remainingTime <= 60 
                        ? 'bg-red-500' 
                        : 'bg-[var(--primary-color)]'
                    }`}
                    style={{
                      width: remainingTime !== null && examData.durationMinutes
                        ? `${(1 - remainingTime / (examData.durationMinutes * 60)) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white p-8 mt-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-lg font-semibold text-[var(--dark-text)] leading-relaxed">
                {currentQuestion.content}
              </p>

              {/* Choices */}
              <div className="mt-6 space-y-4">
                {currentQuestion.choices.map((choice, index) => {
                  const isSelected =
                    studentAnswers[currentQuestionIndex]?.selectedChoiceIndex === index

                  return (
                    <label
                      key={index}
                      className={`block w-full p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--primary-color)] bg-blue-50 ring-2 ring-[var(--primary-color)]'
                          : 'border-gray-300 hover:bg-gray-50'
                      } ${isLocked ? 'cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.questionId}`}
                        className="hidden"
                        checked={isSelected}
                        onChange={() => handleSelectChoice(index)}
                        disabled={isLocked}
                      />
                      <div className="flex items-center">
                        <span
                          className={`w-5 h-5 flex justify-center items-center mr-4 border rounded-full transition-all ${
                            isSelected
                              ? 'border-[var(--primary-color)] bg-white'
                              : 'border-gray-400 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <span className="block w-3 h-3 bg-[var(--primary-color)] rounded-full m-0.5" />
                          )}
                        </span>
                        <span className="text-base text-[var(--medium-text)]">
                          {choice.content}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0 || isLocked}
                className="btn-secondary flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50"
              >
                Previous
              </button>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  disabled={isLocked}
                  className="btn-secondary flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold shadow-sm text-[var(--primary-color)] border-[var(--primary-color)] hover:bg-blue-50 disabled:opacity-50"
                >
                  Submit Exam
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentQuestionIndex === totalQuestions - 1 || isLocked}
                  className="btn-primary flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Question Navigator */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-6">
              <QuestionNavigator
                totalQuestions={totalQuestions}
                currentQuestionIndex={currentQuestionIndex}
                answers={studentAnswers}
                onQuestionClick={handleQuestionClick}
                title="Question Navigator"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Submit Modal */}
      <ConfirmSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleManualSubmit}
        isLoading={isSubmitting}
      />

      {/* Time Up Modal */}
      <TimeUpModal
        isOpen={isTimeUp}
        isSubmitting={isSubmitting}
      />
    </>
  )
}


