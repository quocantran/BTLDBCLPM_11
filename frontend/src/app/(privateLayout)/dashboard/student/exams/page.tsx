"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JoinExamModal } from "@/components/molecules/JoinExamModal/JoinExamModal";
import { ExamCard } from "@/components/molecules/ExamCard/ExamCard";
import { ConfirmStartExamModal } from "@/components/molecules/ConfirmStartExamModal/ConfirmStartExamModal";
import { CompletedExamCard } from "@/components/molecules/CompletedExamCard/CompletedExamCard";
import { ExamService } from "@/services/index";
import type {
  Exam,
  JoinExamResponseDto,
  CompletedExamResponse,
} from "@/services/types/api.types";
import axios, { AxiosError } from "axios";
import Button from "@/components/atoms/Button/Button";
import { FaceVerificationModal } from "@/components/organisms/FaceVerificationModal/FaceVerificationModal";
import { useAuth } from "@/stores/auth";
import { message } from "antd";

export default function ExamsPage() {
  const { user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">(
    "upcoming"
  );
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const router = useRouter();

  // Hook để gọi API cho tab "Completed"
  const {
    data: completedExams,
    isLoading: isLoadingCompleted,
    error: completedError,
  } = ExamService.useGet<CompletedExamResponse[]>({
    url: "/my-completed",
    options: {
      enabled: activeTab === "completed", // Chỉ gọi khi tab được chọn
      // staleTime: 5 * 60 * 1000, // Cache 5 phút
    },
  });

  // MAPPING DỮ LIỆU
  const handleJoinSuccess = (apiData: JoinExamResponseDto) => {
    const newExam: Exam = {
      id: apiData.publicId,
      title: apiData.title,
      status: apiData.status,
      courseCode: apiData.course.publicId,
      durationInMinutes: apiData.durationMinutes,
      startTime: new Date(apiData.startTime),
    };

    if (!upcomingExams.find((exam) => exam.id === newExam.id)) {
      setUpcomingExams((prevExams) => [...prevExams, newExam]);
    }
  };

  const handleStartExamClick = (exam: Exam) => {
    const missingFields: string[] = [];

    if (!user?.citizenId) {
      missingFields.push("Citizen ID");
    }
    if (!user?.dateOfBirth) {
      missingFields.push("Date of Birth");
    }
    if (!user?.imageUrl) {
      missingFields.push("Profile Image");
    }

    if (missingFields.length > 0) {
      messageApi.error({
        content: `Please update your account information: ${missingFields.join(
          ", "
        )}. Go to Profile page to update.`,
        duration: 5,
        onClick: () => {
          router.push("/profile");
        },
      });
      return;
    }

    setSelectedExam(exam);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmStart = () => {
    if (!selectedExam) return;
    console.log(
      `Starting exam: ${selectedExam.title} (ID: ${selectedExam.id})`
    );
    setIsConfirmModalOpen(false);
    setIsFaceModalOpen(true); // Mở modal AI thay vì chuyển trang ngay
  };

  // Hàm này sẽ được gọi bởi FaceVerificationModal khi thành công
  const handleVerificationSuccess = () => {
    if (!selectedExam) return;

    console.log(`Face verified! Starting exam: ${selectedExam.title}`);

    // Đóng modal AI
    setIsFaceModalOpen(false);

    router.push(`/dashboard/student/exams/${selectedExam.id}/take`);

    // Dọn dẹp state
    setSelectedExam(null);
  };

  return (
    <>
      {contextHolder}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--dark-text)]">
            Exams
          </h2>
          <Button
            variant="primary"
            size="medium"
            onClick={() => setIsJoinModalOpen(true)}
            className="btn-primary flex items-center gap-2 rounded-md px-4 py-2 text-sm !font-bold shadow-sm"
          >
            {/* <span className="material-symbols-outlined text-base">add_circle</span> */}
            <span className="truncate">Join Exam by Code</span>
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav aria-label="Tabs" className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`whitespace-nowrap py-4 px-1 text-sm ${
                activeTab === "upcoming" ? "tab-active" : "tab-inactive"
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`whitespace-nowrap py-4 px-1 text-sm ${
                activeTab === "completed" ? "tab-active" : "tab-inactive"
              }`}
            >
              Completed
            </button>
          </nav>
        </div>

        <div className="mt-8">
          {activeTab === "upcoming" && (
            <div className="space-y-4">
              {upcomingExams.length > 0 ? (
                upcomingExams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    isActive={exam.status === "active"}
                    onStartClick={handleStartExamClick}
                  />
                ))
              ) : (
                <div className="text-center py-12 px-4 bg-white rounded-lg border border-dashed border-gray-300">
                  {/* ... (icon và text "No upcoming exams") ... */}
                  <h3 className="mt-4 text-lg font-semibold text-[var(--dark-text)]">
                    No upcoming exams
                  </h3>
                  <p className="mt-1 text-sm text-[var(--medium-text)]">
                    You currently have no scheduled exams.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* --- TAB COMPLETED (Mới) --- */}
          {activeTab === "completed" && (
            <div className="space-y-4">
              {isLoadingCompleted && (
                <div className="text-center py-12 text-sm text-[var(--medium-text)]">
                  Loading completed exams...
                </div>
              )}
              {/* ⭐️ Hiển thị lỗi 403 thân thiện */}
              {completedError && (
                <div className="text-center py-12 text-red-600">
                  <h3 className="text-lg font-semibold">
                    Failed to load exams
                  </h3>
                  <p className="text-sm mt-1">
                    Error:{" "}
                    {(completedError as AxiosError).response?.status === 403
                      ? "You do not have permission to view this."
                      : (completedError as AxiosError).message}
                  </p>
                </div>
              )}
              {!isLoadingCompleted &&
                completedExams &&
                completedExams.length > 0 &&
                completedExams.map((exam) => (
                  <CompletedExamCard key={exam.submissionId} exam={exam} />
                ))}
              {!isLoadingCompleted &&
                (!completedExams || completedExams.length === 0) && (
                  <div className="text-center py-12 px-4 bg-white rounded-lg border border-dashed border-gray-300">
                    <h3 className="mt-4 text-lg font-semibold text-[var(--dark-text)]">
                      No completed exams
                    </h3>
                    <p className="mt-1 text-sm text-[var(--medium-text)]">
                      You have not completed any exams yet.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      <JoinExamModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinSuccess={handleJoinSuccess}
      />
      <ConfirmStartExamModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmStart}
        exam={selectedExam}
      />

      <FaceVerificationModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        onSuccess={handleVerificationSuccess}
      />
    </>
  );
}
