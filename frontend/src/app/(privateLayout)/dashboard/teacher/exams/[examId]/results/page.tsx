"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Table,
  Empty,
  Typography,
  Space,
  Row,
  Col,
  Modal,
  Spin,
} from "antd";
import { CheckCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import "./styles.css";
import type { ColumnsType } from "antd/es/table";
import { Icon, Input, Select, Button, Badge } from "@/components/atoms";
import { useExamResults, type ExamResultEntity } from "@/services/api/exam.api";
import { FilterBar } from "@/components/molecules";
import { useCertificateIssue } from "@/hooks/certificate/useCertificate";

const { Title, Text } = Typography;

type StudentStatusFilter = "all" | "pass" | "fail";
type SortOption = "name_asc" | "name_desc" | "grade_desc" | "grade_asc";

const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "Pass", value: "pass" },
  { label: "Fail", value: "fail" },
];

const sortOptions = [
  { label: "Student Name (A-Z)", value: "name_asc" },
  { label: "Student Name (Z-A)", value: "name_desc" },
  { label: "Grade (High to Low)", value: "grade_desc" },
  { label: "Grade (Low to High)", value: "grade_asc" },
];

const getStatusTag = (status: ExamResultEntity["status"]) => {
  if (status === "pass") {
    return <Badge label="Pass" variant="success" />;
  }
  if (status === "fail") {
    return <Badge label="Fail" variant="danger" />;
  }
  return <Badge label="Unknown" variant="default" />;
};

const getGradeDisplay = (record: ExamResultEntity) => {
  return `${record.grade}/${record.maxGrade}`;
};

const ResultsPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const examId = params?.examId as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("name_asc");
  const [minGrade, setMinGrade] = useState("");
  const [maxGrade, setMaxGrade] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ExamResultEntity | null>(
    null
  );
  const {
    issueCertificate,
    loading: isIssuingCertificate,
    error: certificateError,
  } = useCertificateIssue();
  const { data, isLoading, isFetching, isError, error, refetch } =
    useExamResults(examId, {
      enabled: Boolean(examId),
      refetchOnWindowFocus: false,
    });

  const exam = data?.data.exam;
  const results = data?.data.results ?? [];

  const minGradeValue = useMemo(() => {
    if (!minGrade.trim()) {
      return null;
    }
    const parsed = Number(minGrade);
    return Number.isFinite(parsed) ? parsed : null;
  }, [minGrade]);

  const maxGradeValue = useMemo(() => {
    if (!maxGrade.trim()) {
      return null;
    }
    const parsed = Number(maxGrade);
    return Number.isFinite(parsed) ? parsed : null;
  }, [maxGrade]);

  const filteredResults = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    return results
      .filter((result) => {
        const matchesSearch = normalizedTerm
          ? result.studentName.toLowerCase().includes(normalizedTerm) ||
            result.studentCode.toLowerCase().includes(normalizedTerm)
          : true;
        const matchesStatus =
          statusFilter === "all" ? true : result.status === statusFilter;
        const matchesMin =
          minGradeValue === null ? true : result.grade >= minGradeValue;
        const matchesMax =
          maxGradeValue === null ? true : result.grade <= maxGradeValue;
        return matchesSearch && matchesStatus && matchesMin && matchesMax;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case "grade_desc":
            return b.grade - a.grade;
          case "grade_asc":
            return a.grade - b.grade;
          case "name_desc":
            return b.studentName.localeCompare(a.studentName);
          case "name_asc":
          default:
            return a.studentName.localeCompare(b.studentName);
        }
      });
  }, [
    results,
    searchTerm,
    statusFilter,
    sortOption,
    minGradeValue,
    maxGradeValue,
  ]);

  const examStats = useMemo(() => {
    const totalStudents = results.length;
    const totalPass = results.filter(
      (result) => result.status === "pass"
    ).length;
    const passRate = totalStudents > 0 ? (totalPass / totalStudents) * 100 : 0;
    const totalGrades = results.reduce((acc, result) => acc + result.grade, 0);
    const averageGrade = totalStudents > 0 ? totalGrades / totalStudents : 0;
    const maxGradeAvailable = results[0]?.maxGrade ?? 0;

    return {
      totalStudents,
      totalPass,
      passRate,
      averageGrade,
      maxGradeAvailable,
    };
  }, [results]);

  const columns: ColumnsType<ExamResultEntity> = [
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
      sorter: true,
      render: (text: string) => (
        <Text strong className="text-slate-900">
          {text}
        </Text>
      ),
      sortOrder:
        sortOption === "name_asc"
          ? "ascend"
          : sortOption === "name_desc"
          ? "descend"
          : undefined,
    },
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
      render: (code: string) => (
        <Text className="font-mono text-sm text-slate-500">{code}</Text>
      ),
    },
    {
      title: "Grade",
      key: "grade",
      align: "center",
      render: (_, record) => (
        <Text className="font-semibold text-slate-900">
          {getGradeDisplay(record)}
        </Text>
      ),
      sorter: true,
      sortOrder:
        sortOption === "grade_desc"
          ? "descend"
          : sortOption === "grade_asc"
          ? "ascend"
          : undefined,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status: ExamResultEntity["status"]) => getStatusTag(status),
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_: unknown, record: ExamResultEntity) => (
        <Space size="small">
          <Button
            size="small"
            variant="primary"
            className="!px-4"
            onClick={() =>
              router.push(
                `/dashboard/teacher/exams/${examId}/submissions/${record.submissionId}`
              )
            }
          >
            View Detail
          </Button>
          {record.status === "pass" && (
            <Button
              size="small"
              variant="outline"
              className="!px-4"
              onClick={() => {
                setSelectedRecord(record);
                setIsModalOpen(true);
              }}
            >
              Issue Certificates
            </Button>
          )}
        </Space>
      ),
      responsive: ["lg"],
    },
  ];

  const isBusy = isLoading || isFetching;

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Title level={3} className="!m-0 text-slate-900">
              Exam Results{exam?.title ? `: ${exam.title}` : ""}
            </Title>
            <Text type="secondary">
              Review performance and manage student results for this exam.
            </Text>
          </div>
          <Space wrap>
            <Button variant="outline" size="medium" onClick={handleBack}>
              <span className="flex items-center gap-2">
                <Icon name="arrow-left" />
                Back
              </span>
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="rounded-3xl border border-slate-200 shadow-sm">
              <Space direction="vertical" size={4}>
                <Text type="secondary">Total Students</Text>
                <Title level={4} className="!m-0">
                  {examStats.totalStudents}
                </Title>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="rounded-3xl border border-slate-200 shadow-sm">
              <Space direction="vertical" size={4}>
                <Text type="secondary">Average Grade</Text>
                <Title level={4} className="!m-0">
                  {examStats.maxGradeAvailable
                    ? `${examStats.averageGrade.toFixed(1)}/${
                        examStats.maxGradeAvailable
                      }`
                    : examStats.averageGrade.toFixed(1)}
                </Title>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="rounded-3xl border border-slate-200 shadow-sm">
              <Space direction="vertical" size={4}>
                <Text type="secondary">Pass Rate</Text>
                <Title level={4} className="!m-0 text-emerald-600">
                  {examStats.passRate.toFixed(0)}%
                </Title>
              </Space>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="rounded-3xl border border-slate-200 shadow-sm">
              <Space direction="vertical" size={4}>
                <Text type="secondary">Status</Text>
                <div className="flex items-center gap-2">
                  {exam?.status ? (
                    <Badge
                      label={exam.status}
                      variant={
                        exam.status.toLowerCase() === "completed"
                          ? "completed"
                          : exam.status.toLowerCase() === "active"
                          ? "active"
                          : "scheduled"
                      }
                    />
                  ) : (
                    <Text>-</Text>
                  )}
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <FilterBar
          options={[
            {
              key: "search",
              colProps: { xs: 24, lg: 8 },
              content: (
                <Input
                  placeholder="Search by name or code..."
                  prefix={<Icon name="search" />}
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
              ),
            },
            {
              key: "status",
              colProps: { xs: 24, sm: 12, lg: 5 },
              content: (
                <Select
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(value as StudentStatusFilter)
                  }
                  options={statusOptions}
                  placeholder="Filter by status"
                />
              ),
            },
            {
              key: "grade",
              colProps: { xs: 24, sm: 12, lg: 6 },
              content: (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={minGrade}
                    onChange={setMinGrade}
                    min={0}
                  />
                  <span className="text-slate-400">-</span>
                  <Input
                    placeholder="Max"
                    type="number"
                    value={maxGrade}
                    onChange={setMaxGrade}
                    min={0}
                  />
                </div>
              ),
            },
            {
              key: "sort",
              colProps: { xs: 24, sm: 12, lg: 5 },
              content: (
                <Select
                  value={sortOption}
                  onChange={(value) => setSortOption(value as SortOption)}
                  options={sortOptions}
                  placeholder="Sort results"
                />
              ),
            },
          ]}
        />

        <Card className="rounded-3xl border border-slate-200 shadow-sm">
          <Table<ExamResultEntity>
            rowKey={(record) => record.submissionId}
            columns={columns}
            dataSource={filteredResults}
            loading={isBusy}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            className="exam-results-table"
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    isError
                      ? "Failed to load results. Please try again."
                      : "No results found for this exam."
                  }
                />
              ),
            }}
            onChange={(_pagination, _filters, sorter) => {
              const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
              if (!activeSorter?.order) {
                return;
              }
              if (activeSorter.columnKey === "studentName") {
                setSortOption(
                  activeSorter.order === "descend" ? "name_desc" : "name_asc"
                );
              }
              if (activeSorter.columnKey === "grade") {
                setSortOption(
                  activeSorter.order === "descend" ? "grade_desc" : "grade_asc"
                );
              }
            }}
          />
          {isError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              <p>Failed to load exam results.</p>
              <Button
                variant="link"
                size="small"
                onClick={() => void refetch()}
              >
                Try again
              </Button>
              {error instanceof Error ? (
                <p className="text-xs text-red-500">{error.message}</p>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
      <Modal
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
        }}
        onOk={async () => {
          if (!selectedRecord) return;

          // Close confirm modal and open processing modal
          setIsModalOpen(false);
          setIsProcessingModalOpen(true);

          try {
            await issueCertificate({
              examId: examId,
              studentId: selectedRecord.studentId,
            });
            // Close processing modal and open success modal
            setIsProcessingModalOpen(false);
            setIsSuccessModalOpen(true);
          } catch (error) {
            console.error("Failed to issue certificate:", error);
            // Close processing modal and reopen confirm modal with error
            setIsProcessingModalOpen(false);
            setIsModalOpen(true);
          }
        }}
        okText="Yes, Create Certificate"
        cancelText="Cancel"
        okButtonProps={{
          loading: isIssuingCertificate,
          disabled: isIssuingCertificate,
        }}
        cancelButtonProps={{
          disabled: isIssuingCertificate,
        }}
        centered
        width={400}
        maskClosable={false}
      >
        <div className="space-y-2">
          <Title level={4}>Issue Certificate</Title>
          <Text>
            Are you sure you want to create a certificate for{" "}
            <Text strong>{selectedRecord?.studentName}</Text>?
          </Text>
          {selectedRecord && (
            <div className="mt-3 text-sm text-slate-500">
              <Text>Student Code: {selectedRecord.studentCode}</Text>
              <br />
              <Text>Grade: {getGradeDisplay(selectedRecord)}</Text>
            </div>
          )}
          {certificateError !== null && certificateError !== undefined && (
            <div className="mt-2 text-sm text-red-600">
              Failed to issue certificate. Please try again.
              {certificateError instanceof Error && (
                <div className="mt-1 text-xs">{certificateError.message}</div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Processing Modal */}
      <Modal
        open={isProcessingModalOpen}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        width={400}
      >
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Spin
            indicator={
              <LoadingOutlined
                style={{ fontSize: 48, color: "#3b82f6" }}
                spin
              />
            }
          />
          <Title level={4} className="!m-0 text-center">
            Processing Certificate
          </Title>
          <Text className="text-center text-slate-500">
            Please wait while we create the certificate for{" "}
            <Text strong>{selectedRecord?.studentName}</Text>...
          </Text>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        open={isSuccessModalOpen}
        onCancel={() => {
          setIsSuccessModalOpen(false);
          setSelectedRecord(null);
        }}
        onOk={() => {
          setIsSuccessModalOpen(false);
          setSelectedRecord(null);
        }}
        okText="Close"
        cancelButtonProps={{ style: { display: "none" } }}
        centered
        width={400}
        maskClosable={false}
      >
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <CheckCircleOutlined style={{ fontSize: 64, color: "#10b981" }} />
          <Title level={4} className="!m-0 text-center">
            Certificate Issued Successfully!
          </Title>
          <Text className="text-center text-slate-600">
            The certificate has been successfully created for{" "}
            <Text strong>{selectedRecord?.studentName}</Text>.
          </Text>
          {selectedRecord && (
            <div className="mt-2 text-sm text-slate-500 text-center">
              <Text>Student Code: {selectedRecord.studentCode}</Text>
              <br />
              <Text>Grade: {getGradeDisplay(selectedRecord)}</Text>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ResultsPage;
