"use client";
import SearchFilter, {
  SearchFilterType,
} from "@/components/certificate/SearchFilter";
import { useCertificate } from "@/hooks/certificate/useCertificate";
import type { ApiParamsProps } from "@/services";
import { Card, Table, Typography, Space, Empty } from "antd";
import { Badge } from "@/components/atoms";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { Fragment, useMemo, useState } from "react";

type TeacherCertificate = {
  id: string;
  course?: { courseName?: string };
  student?: { fullName?: string; email?: string };
  status?: string;
  issuedAt?: string;
  transactionHash?: string;
};

const TeacherCertificatesPage = () => {
  const [searchParams, setSearchParams] = useState<{
    courseName?: string;
    status?: string;
  }>({});
  const [courseNameInput, setCourseNameInput] = useState<string>("");

  const statusOptions = [
    { label: "All Status", value: "" },
    { label: "Issued", value: "issued" },
    { label: "Pending", value: "pending" },
    { label: "Revoked", value: "revoked" },
  ];

  const apiParams = useMemo<ApiParamsProps>(() => {
    const params: ApiParamsProps = {};
    if (searchParams.courseName) params.courseName = searchParams.courseName;
    if (searchParams.status) params.status = searchParams.status;
    return params;
  }, [searchParams]);

  const { data, loading, error } = useCertificate(apiParams);
  const certificates = (data as TeacherCertificate[]) || [];

  const handleChange = (
    key: keyof typeof searchParams,
    value: string | Dayjs | undefined
  ) => {
    setSearchParams((prev) => {
      const next = { ...prev } as any;
      next[key] = value || undefined;
      return next;
    });
  };

  const handleViewOnScan = (transactionHash: string) => {
    if (!transactionHash) return;
    window.open(`https://testnet.snowtrace.io/tx/${transactionHash}`, "_blank");
  };

  const columns: ColumnsType<TeacherCertificate> = [
    {
      title: "Course",
      dataIndex: ["course", "courseName"],
      key: "course",
      render: (_: unknown, record) => record?.course?.courseName || "-",
    },
    {
      title: "Student",
      key: "student",
      render: (_: unknown, record) => record?.student?.fullName || "-",
      responsive: ["lg"],
    },
    {
      title: "Token Id",
      dataIndex: ["tokenId"],
      key: "tokenId",
      render: (tokenId: string) => {
        return (
          <span className="font-medium text-[14px] leading-[20px] text-gray-900">
            {tokenId || "-"}
          </span>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status?: string) => {
        const normalized = (status || "").toLowerCase();
        const variant =
          normalized === "issued"
            ? "success"
            : normalized === "pending"
            ? "active"
            : normalized === "revoked"
            ? "danger"
            : "default";
        return <Badge label={status || "-"} variant={variant as any} />;
      },
    },
    {
      title: "Issued At",
      dataIndex: "issuedAt",
      key: "issuedAt",
      render: (iso?: string) => (iso ? dayjs(iso).format("YYYY-MM-DD") : "-"),
      responsive: ["md"],
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_: unknown, record) => (
        <Space size="small">
          <button
            className="!text-white bg-blue-600 text-[12px] font-semibold px-3 py-2 rounded-[6px]"
            onClick={() => handleViewOnScan(record?.transactionHash || "")}
          >
            View on Scan
          </button>
        </Space>
      ),
    },
  ];

  return (
    <Fragment>
      <h1 className="font-bold text-[30px] leading-[36px]">Certificates</h1>
      <p className="font-normal text-[16px] text-[#4A5568] leading-[24px] mt-1">
        Manage certificates you can issue to students.
      </p>

      <div className="mt-8 flex gap-4 w-full justify-between p-4 bg-white rounded-[8px] shadow-md mb-[24px]">
        <div className="flex-1">
          <p className="font-medium text-[14px] leading-[20px] text-[#4A5568]">
            Course Name
          </p>
          <SearchFilter
            type={SearchFilterType.SEARCH_INPUT}
            className="w-full min-h-[40px]"
            placeholder="Search by course name"
            value={courseNameInput}
            onChange={(v) => setCourseNameInput(v as string)}
            onEnter={(v) => handleChange("courseName", v)}
          />
        </div>
        <div className="flex-1">
          <p className="font-medium text-[14px] leading-[20px] text-[#4A5568]">
            Status
          </p>
          <SearchFilter
            type={SearchFilterType.SELECT_INPUT}
            className="w-full min-h-[40px]"
            placeholder="Select status"
            options={statusOptions}
            value={searchParams.status}
            onChange={(v) => handleChange("status", v)}
          />
        </div>
      </div>

      <Card className="rounded-3xl border border-slate-200 shadow-sm">
        <Table<TeacherCertificate>
          rowKey={(record) => record.id}
          columns={columns}
          dataSource={certificates}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{
            emptyText: (
              <Empty
                description={
                  error
                    ? "Failed to load certificates"
                    : "No certificates found"
                }
              />
            ),
          }}
        />
      </Card>
    </Fragment>
  );
};

export default TeacherCertificatesPage;
