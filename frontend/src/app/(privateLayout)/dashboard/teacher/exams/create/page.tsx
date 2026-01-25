"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { App, Form, Modal, Radio, Spin } from "antd";
import {
  Button,
  Icon,
  Input,
  Textarea,
  type SelectOption,
} from "@/components/atoms";
import { QuestionPreviewItem } from "@/components/molecules";
import {
  FinalizeExamModal,
  type FinalizeExamFormValues,
} from "@/components/organisms";
import {
  useCreateExam,
  useGetExam,
  useUpdateExam,
  type CreateExamRequest,
  type ExamEntity,
} from "@/services/api/exam.api";
import { useTeacherCourses } from "@/services/api/course.api";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { parseApiError } from "@/services/utils/auth.utils";

interface AnswerChoiceDraft {
  id: string;
  text: string;
}

interface ExamQuestion {
  id: string;
  prompt: string;
  choices: AnswerChoiceDraft[];
  correctChoiceId?: string | null;
}

const generateChoiceId = (index: number) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `choice-${crypto.randomUUID()}`;
  }
  return `choice-${Date.now()}-${index}`;
};

const createEmptyChoices = (count = 4): AnswerChoiceDraft[] => {
  return Array.from({ length: count }).map((_, index) => ({
    id: generateChoiceId(index),
    text: "",
  }));
};

const createExistingChoiceId = (questionId: string, index: number) => {
  return `${questionId}-choice-${index}`;
};

const padChoices = (choices: AnswerChoiceDraft[], desiredLength = 4) => {
  const padded = choices.map((choice, index) => ({
    id: choice.id ?? generateChoiceId(index),
    text: choice.text ?? "",
  }));

  while (padded.length < desiredLength) {
    padded.push({ id: generateChoiceId(padded.length), text: "" });
  }

  return padded.slice(0, desiredLength);
};

const initialQuestions: ExamQuestion[] = [];

const mapExamQuestionToDraft = (
  question: ExamEntity["questions"][number]
): ExamQuestion => {
  const choices = question.answer.map((choice, index) => ({
    id: createExistingChoiceId(question.id, index),
    text: choice.content ?? "",
  }));

  const correctChoiceIndex = Math.max(0, question.answerQuestion - 1);
  const correctChoice = choices[correctChoiceIndex];

  return {
    id: question.id,
    prompt: question.content ?? "",
    choices,
    correctChoiceId: correctChoice?.id ?? null,
  };
};

const mapExamToFinalizeValues = (exam: ExamEntity): FinalizeExamFormValues => {
  return {
    courseId: exam.courseId,
    durationMinutes: exam.durationMinutes,
    rateScore: exam.rateScore,
    startTime: exam.startTime ? dayjs(exam.startTime) : null,
    endTime: exam.endTime ? dayjs(exam.endTime) : null,
  };
};

export default function CreateTeacherExamPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams?.get("examId") ?? undefined;
  const { user, getUser } = useAuth();
  const createExamMutation = useCreateExam();
  const updateExamMutation = useUpdateExam();
  const isEditing = Boolean(examId);
  const shouldLoadExam = Boolean(examId);
  const {
    data: examDetailResponse,
    isLoading: isLoadingExam,
    isFetching: isFetchingExam,
    isError: isExamError,
    error: examError,
  } = useGetExam(examId ?? "", {
    enabled: shouldLoadExam,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const { data: teacherCoursesData } = useTeacherCourses(user?.id, undefined, {
    enabled: Boolean(user?.id),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!user?.id) {
      void getUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [examTitle, setExamTitle] = useState("");
  const [choiceTemplate, setChoiceTemplate] = useState<AnswerChoiceDraft[]>(
    createEmptyChoices()
  );
  const [correctChoiceId, setCorrectChoiceId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>(initialQuestions);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [questionPendingDeletion, setQuestionPendingDeletion] =
    useState<ExamQuestion | null>(null);
  const [finalizeInitialValues, setFinalizeInitialValues] =
    useState<FinalizeExamFormValues>();
  const [form] = Form.useForm<{
    prompt: string;
    choices: { text: string }[];
    correctChoiceId?: string;
  }>();

  const totalQuestions = useMemo(() => questions.length, [questions]);

  const courseOptions = useMemo<SelectOption[]>(() => {
    const courses = teacherCoursesData?.data.courses ?? [];
    return courses.map((course) => ({
      label: course.courseName ?? course.id,
      value: course.id,
    }));
  }, [teacherCoursesData]);

  const getQuestionPayloads = (): CreateExamRequest["questions"] => {
    if (questions.length === 0) {
      throw new Error("Please add at least one question before saving.");
    }

    return questions.map((question, index) => {
      const trimmedPrompt = question.prompt.trim();

      if (!trimmedPrompt) {
        throw new Error(`Question ${index + 1} is missing content.`);
      }

      const trimmedChoices = question.choices
        .map((choice) => ({
          ...choice,
          text: choice.text.trim(),
        }))
        .filter((choice) => choice.text.length > 0);

      if (trimmedChoices.length < 2) {
        throw new Error(
          `Question ${index + 1} must have at least two answer choices.`
        );
      }

      const correctIndex = trimmedChoices.findIndex(
        (choice) => choice.id === question.correctChoiceId
      );

      if (correctIndex === -1) {
        throw new Error(
          `Please mark the correct answer for question ${index + 1}.`
        );
      }

      return {
        content: trimmedPrompt,
        answerQuestion: correctIndex + 1,
        answer: trimmedChoices.map((choice) => ({ content: choice.text })),
      };
    });
  };

  const getTrimmedTitle = () => examTitle.trim();

  const buildExamRequest = (
    finalizeValues: FinalizeExamFormValues
  ): CreateExamRequest => {
    const trimmedTitle = getTrimmedTitle();

    if (!trimmedTitle) {
      throw new Error("Please enter an exam title before saving.");
    }

    const questionPayloads = getQuestionPayloads();

    const { courseId, durationMinutes, startTime, endTime, rateScore } =
      finalizeValues;

    if (!courseId) {
      throw new Error("Please select a course for this exam.");
    }

    if (
      durationMinutes === undefined ||
      Number.isNaN(durationMinutes) ||
      durationMinutes <= 0
    ) {
      throw new Error("Please provide a valid exam duration.");
    }

    if (!startTime) {
      throw new Error("Please provide a start time.");
    }

    if (!endTime) {
      throw new Error("Please provide an end time.");
    }

    if (startTime.isAfter(endTime)) {
      throw new Error("End time must be after start time.");
    }

    if (rateScore === undefined || Number.isNaN(rateScore)) {
      throw new Error("Please provide a passing score.");
    }

    return {
      title: trimmedTitle,
      durationMinutes,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: "scheduled",
      courseId,
      rateScore,
      questions: questionPayloads,
    };
  };

  const applyBuilderValues = (
    choices: AnswerChoiceDraft[],
    prompt = "",
    correctChoiceId?: string | null
  ) => {
    const paddedChoices = padChoices(choices);
    const sanitizedCorrectId =
      correctChoiceId &&
      paddedChoices.some((choice) => choice.id === correctChoiceId)
        ? correctChoiceId
        : null;

    setChoiceTemplate(paddedChoices);
    setCorrectChoiceId(sanitizedCorrectId);
    form.setFieldsValue({
      prompt,
    });
  };

  const resetBuilder = () => {
    setEditingQuestionId(null);
    form.resetFields(["prompt"]);
    applyBuilderValues(createEmptyChoices());
  };

  useEffect(() => {
    applyBuilderValues(choiceTemplate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shouldLoadExam) {
      return;
    }

    if (isExamError) {
      message.error(
        parseApiError(examError) ?? "Unable to load exam for editing."
      );
      router.replace("/dashboard/teacher");
      return;
    }

    const exam = examDetailResponse?.data.exam;

    if (!exam) {
      return;
    }

    setExamTitle(exam.title ?? "");
    setQuestions(exam.questions.map(mapExamQuestionToDraft));
    setFinalizeInitialValues(mapExamToFinalizeValues(exam));
    setEditingQuestionId(null);
    setExpandedQuestionId(null);
    applyBuilderValues(createEmptyChoices());
  }, [examDetailResponse, isExamError, message, router, shouldLoadExam]);

  const handleChoiceTextChange = (index: number, value: string) => {
    setChoiceTemplate((prev) => {
      const updated = [...prev];
      const target = updated[index];

      if (!target) {
        return updated;
      }

      updated[index] = { ...target, text: value };
      return updated;
    });
  };

  const handleSelectCorrectChoice = (value: string) => {
    setCorrectChoiceId(value);
  };

  const handleAddQuestion = async (values: { prompt: string }) => {
    try {
      const trimmedPrompt = values.prompt.trim();
      const mergedChoices = choiceTemplate.map((choice) => ({
        id: choice.id,
        text: choice.text.trim(),
      }));

      const choicePayload = mergedChoices.filter(
        (choice) => choice.text.length > 0
      );

      if (choicePayload.length < 2) {
        message.error("Please provide at least two answer choices.");
        return;
      }

      if (
        !correctChoiceId ||
        !choicePayload.some((choice) => choice.id === correctChoiceId)
      ) {
        message.error(
          "Please select the correct answer from the provided choices."
        );
        return;
      }

      const payload: ExamQuestion = {
        id: editingQuestionId ?? `question-${Date.now()}`,
        prompt: trimmedPrompt,
        choices: choicePayload,
        correctChoiceId,
      };

      setQuestions((prev) => {
        if (editingQuestionId) {
          return prev.map((question) =>
            question.id === editingQuestionId ? payload : question
          );
        }
        return [...prev, payload];
      });

      resetBuilder();
    } catch (errorInfo) {
      void errorInfo;
    }
  };

  const applyQuestionForEditing = (question: ExamQuestion) => {
    setEditingQuestionId(question.id);
    setExpandedQuestionId(question.id);
    applyBuilderValues(
      question.choices,
      question.prompt,
      question.correctChoiceId
    );
  };

  const handleEditQuestion = (question: ExamQuestion) => {
    applyQuestionForEditing(question);
  };

  const handleRequestDeleteQuestion = (questionId: string) => {
    const targetQuestion = questions.find(
      (question) => question.id === questionId
    );
    if (!targetQuestion) {
      return;
    }
    setQuestionPendingDeletion(targetQuestion);
  };

  const handleConfirmDeleteQuestion = () => {
    if (!questionPendingDeletion) {
      return;
    }

    const questionId = questionPendingDeletion.id;

    setQuestions((prev) =>
      prev.filter((question) => question.id !== questionId)
    );

    if (editingQuestionId === questionId) {
      resetBuilder();
    }

    setExpandedQuestionId((prev) => (prev === questionId ? null : prev));

    setQuestionPendingDeletion(null);
    message.success("Question removed from preview");
  };

  const handleCancelDeleteQuestion = () => {
    setQuestionPendingDeletion(null);
  };

  const handleToggleExpand = (questionId: string) => {
    setExpandedQuestionId((prev) => (prev === questionId ? null : questionId));
  };

  const handleGenerateAi = () => {
    // Future: replace with actual AI generation logic
    console.log("AI generation not implemented yet");
  };

  const handleSaveExamClick = () => {
    try {
      const trimmedTitle = getTrimmedTitle();

      if (!trimmedTitle) {
        throw new Error("Please enter an exam title before saving.");
      }

      getQuestionPayloads();
      setIsFinalizeModalOpen(true);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error("Unable to proceed. Please review the exam details.");
      }
    }
  };

  const handleFinalizeExamSubmit = async (
    finalizeValues: FinalizeExamFormValues
  ) => {
    try {
      const requestPayload = buildExamRequest(finalizeValues);

      if (isEditing && examId) {
        const response = await updateExamMutation.mutateAsync({
          examId,
          data: requestPayload,
        });

        if (!response.success) {
          message.error(response.message ?? "Failed to update exam");
          return;
        }

        message.success(response.message ?? "Exam updated successfully");
        setIsFinalizeModalOpen(false);
        void router.push("/dashboard/teacher");
        return;
      }

      const response = await createExamMutation.mutateAsync({
        data: requestPayload as unknown as Record<string, unknown>,
      });

      if (!response.success) {
        message.error(response.message ?? "Failed to create exam");
        return;
      }

      message.success(response.message ?? "Exam created successfully");
      setIsFinalizeModalOpen(false);
      setExamTitle("");
      setQuestions([]);
      resetBuilder();
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };

      if (!apiError.response && apiError.message) {
        message.error(apiError.message);
        return;
      }

      const apiMessage = apiError.response?.data?.message;
      message.error(apiMessage ?? "Unable to save exam");
    }
  };

  const isBusy = isLoadingExam || isFetchingExam;
  const isMutationPending =
    createExamMutation.isPending || updateExamMutation.isPending;

  useEffect(() => {
    if (!isEditing) {
      setFinalizeInitialValues(undefined);
    }
  }, [isEditing]);

  if (isEditing && isBusy) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin tip="Loading exam..." />
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              {isEditing ? "Edit Exam" : "Create New Exam"}
            </h1>
          </div>
          <Button
            variant="primary"
            size="medium"
            onClick={handleSaveExamClick}
            loading={isMutationPending}
            className="self-start md:self-auto"
          >
            <span className="flex items-center gap-2">
              <Icon name="save" size="small" />
              {isEditing ? "Update Exam" : "Save Exam"}
            </span>
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Question Builder
              </h2>
            </div>

            <Form
              form={form}
              layout="vertical"
              className="mt-4 space-y-5"
              initialValues={{
                prompt: "",
              }}
              onFinish={handleAddQuestion}
            >
              <Form.Item
                name="prompt"
                label="Question Content"
                rules={[
                  {
                    required: true,
                    message: "Please enter the question content",
                  },
                  {
                    min: 5,
                    message: "Question content should be at least 5 characters",
                  },
                ]}
              >
                <Textarea
                  id="question-content"
                  placeholder="Enter question content here"
                  rows={2}
                />
              </Form.Item>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-600">
                  Answer Choices
                </div>
                <Radio.Group
                  className="flex w-full flex-col space-y-2"
                  value={correctChoiceId ?? undefined}
                  onChange={(event) =>
                    handleSelectCorrectChoice(event.target.value)
                  }
                >
                  {choiceTemplate.map((choice, index) => (
                    <div
                      key={choice.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 transition hover:border-blue-200"
                    >
                      <Radio value={choice.id} className="pt-1" />
                      <Input
                        value={choice.text}
                        onChange={(value) =>
                          handleChoiceTextChange(index, value)
                        }
                        placeholder={`Answer Choice ${index + 1}`}
                      />
                    </div>
                  ))}
                </Radio.Group>
              </div>

              <Button
                htmlType="submit"
                size="large"
                variant="primary"
                fullWidth
              >
                {editingQuestionId
                  ? "Update Question"
                  : "Add Question to Preview"}
              </Button>
            </Form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-3">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-600"
                  htmlFor="exam-title"
                >
                  Exam Title
                </label>
                <Input
                  id="exam-title"
                  value={examTitle}
                  onChange={setExamTitle}
                  placeholder="Enter exam title"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Live Exam Preview
                  </h2>
                  <span className="text-sm text-slate-500">
                    {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-3">
                  {questions.length > 0 ? (
                    <>
                      {questions.map((question, index) => (
                        <QuestionPreviewItem
                          key={question.id}
                          index={index + 1}
                          question={question.prompt}
                          choices={question.choices.map((choice) => ({
                            id: choice.id,
                            label: choice.text,
                            isCorrect: choice.id === question.correctChoiceId,
                          }))}
                          onEdit={() => handleEditQuestion(question)}
                          onDelete={() =>
                            handleRequestDeleteQuestion(question.id)
                          }
                          onToggleCollapse={() =>
                            handleToggleExpand(question.id)
                          }
                          isExpanded={expandedQuestionId === question.id}
                        />
                      ))}
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center text-sm text-slate-500">
                        New questions will appear here
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                      New questions will appear here
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={Boolean(questionPendingDeletion)}
        title="Remove question"
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        onOk={handleConfirmDeleteQuestion}
        onCancel={handleCancelDeleteQuestion}
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to remove this question from the preview?
        </p>
        {questionPendingDeletion ? (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {questionPendingDeletion.prompt}
          </p>
        ) : null}
      </Modal>

      <FinalizeExamModal
        open={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        onSubmit={handleFinalizeExamSubmit}
        courseOptions={courseOptions}
        loading={isMutationPending}
        initialValues={finalizeInitialValues}
      />
    </React.Fragment>
  );
}
