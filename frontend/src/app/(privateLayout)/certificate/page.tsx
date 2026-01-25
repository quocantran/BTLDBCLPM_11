"use client";
import SearchFilter, {
  SearchFilterType,
} from "@/components/certificate/SearchFilter";
import { useCertificate } from "@/hooks/certificate/useCertificate";
import type { ApiParamsProps } from "@/services";
import { Table, Space, Modal, Descriptions, Image } from "antd";
import { EyeOutlined, ExportOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { Fragment, useMemo, useState } from "react";

const certificate = () => {
  const [searchParams, setSearchParams] = useState<{
    courseName?: string;
    dateIssuedFrom?: string;
    dateIssuedTo?: string;
    status?: string;
  }>({});
  const [courseNameInput, setCourseNameInput] = useState<string>("");
  const [paginationState, setPaginationState] = useState({
    current: 1,
    pageSize: 10,
  });
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const apiParams = useMemo<ApiParamsProps>(() => {
    const params: ApiParamsProps = {};
    if (searchParams.courseName) params.courseName = searchParams.courseName;
    if (searchParams.status) params.status = searchParams.status;
    if (searchParams.dateIssuedFrom)
      params.issuedFrom = searchParams.dateIssuedFrom;
    if (searchParams.dateIssuedTo) params.issuedTo = searchParams.dateIssuedTo;
    return params;
  }, [searchParams]);

  const { data: certificates, loading, error } = useCertificate(apiParams);
  const statusOptions = [
    { label: "All Status", value: "" },
    { label: "Issued", value: "issued" },
    { label: "Pending", value: "pending" },
    { label: "Revoked", value: "revoked" },
  ];

  const handleChange = (
    key: keyof typeof searchParams,
    value: string | Dayjs | undefined
  ) => {
    setSearchParams((prev) => {
      const next = { ...prev } as any;
      if (key === "dateIssuedFrom" || key === "dateIssuedTo") {
        next[key] = value ? (value as Dayjs).format("YYYY-MM-DD") : undefined;
      } else {
        next[key] = value || undefined;
      }
      return next;
    });
  };

  const handleViewOnScan = (transactionHash: string) => {
    window.open(`https://testnet.snowtrace.io/tx/${transactionHash}`, "_blank");
  };

  const handleViewDetail = (record: any) => {
    setSelectedCertificate(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCertificate(null);
  };

  // Helper function to get IPFS image URL
  const getIpfsImageUrl = (
    ipfsHash: string | undefined | null
  ): string | null => {
    if (!ipfsHash) return null;

    // Remove 'ipfs://' prefix if present
    const hash = ipfsHash.replace(/^ipfs:\/\//, "");

    // Use multiple IPFS gateways for reliability
    const gateways = [
      `https://ipfs.io/ipfs/${hash}`,
      `https://gateway.pinata.cloud/ipfs/${hash}`,
      `https://cloudflare-ipfs.com/ipfs/${hash}`,
    ];

    return gateways[0]; // Return first gateway, browser will try others if this fails
  };

  // Get IPFS image hash from certificate (prioritize ipfsImage field)
  const getCertificateIpfsImage = (certificate: any): string | null => {
    return certificate?.ipfsImage || null;
  };

  return (
    <Fragment>
      <h1 className="font-bold text-[30px] leading-[36px]">My Certificates</h1>
      <p className="font-normal text-[16px] text-[#4A5568] leading-[24px] mt-1">
        View and manage your earned certificates.
      </p>
      <div className="mt-8 flex gap-4 w-full justify-between p-4 bg-white rounded-[8px] shadow-md mb-[32px]">
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
            Date Issued From
          </p>
          <SearchFilter
            type={SearchFilterType.DATE_PICKER}
            className="w-full min-h-[40px]"
            placeholder="Select date"
            value={
              searchParams.dateIssuedFrom
                ? dayjs(searchParams.dateIssuedFrom)
                : undefined
            }
            onChange={(v) => handleChange("dateIssuedFrom", v)}
          />
        </div>
        <div className="flex-1">
          <p className="font-medium text-[14px] leading-[20px] text-[#4A5568]">
            Date Issued To
          </p>
          <SearchFilter
            type={SearchFilterType.DATE_PICKER}
            className="w-full min-h-[40px]"
            placeholder="Select date"
            value={
              searchParams.dateIssuedTo
                ? dayjs(searchParams.dateIssuedTo)
                : undefined
            }
            onChange={(v) => handleChange("dateIssuedTo", v)}
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
        {/* <div className="flex-1">
          <p className="font-medium text-[14px] leading-[20px] text-[#4A5568]">
            Sort by
          </p>
          <SearchFilter
            type={SearchFilterType.SELECT_INPUT}
            className="w-full min-h-[40px]"
            placeholder="Select sort by"
          />
        </div> */}
      </div>
      <div className="bg-white rounded-[12px] shadow-lg overflow-hidden border border-gray-100">
        <style jsx global>{`
          .certificate-table .ant-table {
            font-size: 14px;
          }
          .certificate-table .ant-table-thead > tr > th {
            background: #f8fafc !important;
            border-bottom: 2px solid #e2e8f0 !important;
            padding: 16px 24px !important;
            font-weight: 600 !important;
            font-size: 14px !important;
            color: #1a202c !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .certificate-table .ant-table-tbody > tr > td {
            padding: 20px 24px !important;
            border-bottom: 1px solid #f1f5f9 !important;
            vertical-align: middle;
          }
          .certificate-table .ant-table-tbody > tr:hover > td {
            background: #f8fafc !important;
            cursor: pointer;
          }
          .certificate-table .ant-table-tbody > tr:last-child > td {
            border-bottom: none !important;
          }
          .certificate-table .ant-empty {
            padding: 48px 0;
          }
          .certificate-table .ant-pagination {
            padding: 16px 24px;
            margin: 0;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
          }
        `}</style>
        <Table
          className="certificate-table"
          dataSource={certificates}
          loading={loading}
          rowKey={(record, index) => record?.id || index?.toString()}
          pagination={{
            current: paginationState.current,
            pageSize: paginationState.pageSize,
            showSizeChanger: true,
            showTotal: (total) => (
              <span className="text-gray-600 font-medium">
                Total{" "}
                <span className="font-semibold text-gray-900">{total}</span>{" "}
                certificates
              </span>
            ),
            pageSizeOptions: ["10", "20", "50", "100"],
            showQuickJumper: true,
            onChange: (page, pageSize) => {
              setPaginationState({ current: page, pageSize });
            },
            onShowSizeChange: (current, size) => {
              setPaginationState({ current: 1, pageSize: size });
            },
          }}
          columns={[
            {
              title: "No",
              key: "no",
              width: "5%",
              align: "center",
              render: (_: any, __: any, index: number) => {
                const no =
                  (paginationState.current - 1) * paginationState.pageSize +
                  index +
                  1;
                return (
                  <span className="text-[14px] leading-[20px] text-gray-600 font-medium">
                    {no}
                  </span>
                );
              },
            },
            {
              title: "Certificate",
              key: "certificateImage",
              width: "10%",
              align: "center",
              render: (_: any, record: any) => {
                const ipfsImage = getCertificateIpfsImage(record);
                const ipfsUrl = getIpfsImageUrl(ipfsImage);
                if (!ipfsUrl) {
                  return (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Image</span>
                    </div>
                  );
                }
                return (
                  <Image
                    src={ipfsUrl}
                    alt="Certificate"
                    width={64}
                    height={64}
                    className="rounded object-cover cursor-pointer"
                    preview={{
                      src: ipfsUrl,
                      mask: "Preview",
                    }}
                    fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%23f3f4f6' width='64' height='64'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='10' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3EN/A%3C/text%3E%3C/svg%3E"
                  />
                );
              },
            },
            {
              title: "Course Name",
              dataIndex: ["course", "courseName"],
              key: "courseName",
              width: "25%",
              render: (text: string) => (
                <span className="font-semibold text-[15px] leading-[22px] text-gray-900">
                  {text || "-"}
                </span>
              ),
            },
            {
              title: "Token Id",
              dataIndex: ["tokenId"],
              key: "tokenId",
              width: "15%",
              render: (tokenId: string) => {
                return (
                  <span className="font-medium text-[14px] leading-[20px] text-gray-900">
                    {tokenId || "-"}
                  </span>
                );
              },
            },
            {
              title: "Score",
              dataIndex: ["submission", "score"],
              key: "score",
              width: "15%",
              render: (score: string) => {
                return (
                  <span className="font-medium text-[14px] leading-[20px] text-gray-900">
                    {score || "-"}
                  </span>
                );
              },
            },
            {
              title: "Status",
              dataIndex: "status",
              key: "status",
              width: "15%",
              render: (status: string) => {
                const statusConfig: Record<
                  string,
                  { bg: string; text: string }
                > = {
                  issued: { bg: "#DCFCE7", text: "#166533" },
                  pending: { bg: "#FEF3C7", text: "#92400E" },
                  revoked: { bg: "#FEE2E2", text: "#991B1B" },
                };
                const config = statusConfig[status?.toLowerCase()] || {
                  bg: "#E5E7EB",
                  text: "#374151",
                };
                return (
                  <span
                    className="font-medium text-[12px] py-[4px] px-[12px] rounded-full inline-block"
                    style={{
                      backgroundColor: config.bg,
                      color: config.text,
                    }}
                  >
                    {status || "-"}
                  </span>
                );
              },
            },
            {
              title: "Date Issued",
              dataIndex: "issuedAt",
              key: "issuedAt",
              width: "20%",
              render: (date: string) => {
                if (!date)
                  return (
                    <span className="text-[14px] leading-[20px] text-gray-600">
                      -
                    </span>
                  );
                const formattedDate = dayjs(date).format("DD-MM-YYYY");
                return (
                  <span className="text-[14px] leading-[20px] text-gray-600">
                    {formattedDate}
                  </span>
                );
              },
            },
            {
              title: "Action",
              key: "action",
              width: "15%",
              align: "center",
              render: (_, record: any) => (
                <Space>
                  <button
                    onClick={() => handleViewDetail(record)}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                    title="View Details"
                  >
                    <EyeOutlined className="text-[16px]" />
                  </button>
                  <button
                    onClick={() =>
                      handleViewOnScan(record?.transactionHash || "")
                    }
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                    title="View on Scan"
                  >
                    <ExportOutlined className="text-[16px]" />
                  </button>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-blue-600" />
            <span className="font-semibold text-[18px]">
              Certificate Details
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={700}
        className="certificate-detail-modal"
      >
        {selectedCertificate && (
          <div className="mt-4">
            {/* Certificate Image */}
            {getIpfsImageUrl(getCertificateIpfsImage(selectedCertificate)) && (
              <div className="mb-6 flex justify-center">
                <Image
                  src={
                    getIpfsImageUrl(
                      getCertificateIpfsImage(selectedCertificate)
                    ) || ""
                  }
                  alt="Certificate"
                  className="rounded-lg shadow-md"
                  style={{ maxHeight: "400px", maxWidth: "100%" }}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='16' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3EImage not available%3C/text%3E%3C/svg%3E"
                  preview={{
                    mask: "Preview",
                  }}
                />
              </div>
            )}
            <Descriptions
              column={1}
              bordered
              labelStyle={{
                backgroundColor: "#f8fafc",
                fontWeight: 600,
                width: "35%",
                color: "#1a202c",
              }}
              contentStyle={{
                backgroundColor: "#ffffff",
                color: "#4a5568",
              }}
            >
              <Descriptions.Item label="Course Name">
                <span className="font-semibold text-gray-900">
                  {selectedCertificate?.course?.courseName || "-"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Score">
                <span className="font-medium text-gray-900">
                  {selectedCertificate?.submission?.score || "-"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {(() => {
                  const status = selectedCertificate?.status || "";
                  const statusConfig: Record<
                    string,
                    { bg: string; text: string }
                  > = {
                    issued: { bg: "#DCFCE7", text: "#166533" },
                    pending: { bg: "#FEF3C7", text: "#92400E" },
                    revoked: { bg: "#FEE2E2", text: "#991B1B" },
                  };
                  const config = statusConfig[status?.toLowerCase()] || {
                    bg: "#E5E7EB",
                    text: "#374151",
                  };
                  return (
                    <span
                      className="font-medium text-[12px] py-[4px] px-[12px] rounded-full inline-block"
                      style={{
                        backgroundColor: config.bg,
                        color: config.text,
                      }}
                    >
                      {status || "-"}
                    </span>
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Date Issued">
                {selectedCertificate?.issuedAt
                  ? dayjs(selectedCertificate.issuedAt).format("DD-MM-YYYY")
                  : "-"}
              </Descriptions.Item>
              {selectedCertificate?.transactionHash && (
                <Descriptions.Item label="Transaction Hash">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-gray-600 break-all">
                      {selectedCertificate.transactionHash}
                    </span>
                    <button
                      onClick={() =>
                        handleViewOnScan(selectedCertificate.transactionHash)
                      }
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                      title="View on Scan"
                    >
                      <ExportOutlined className="text-[14px]" />
                    </button>
                  </div>
                </Descriptions.Item>
              )}
              {selectedCertificate?.student && (
                <>
                  {selectedCertificate.student.fullName && (
                    <Descriptions.Item label="Student Name">
                      <span className="text-gray-900">
                        {selectedCertificate.student.fullName}
                      </span>
                    </Descriptions.Item>
                  )}
                  {selectedCertificate.student.email && (
                    <Descriptions.Item label="Student Email">
                      <span className="text-gray-900">
                        {selectedCertificate.student.email}
                      </span>
                    </Descriptions.Item>
                  )}
                </>
              )}
              {selectedCertificate?.id && (
                <Descriptions.Item label="Certificate ID">
                  <span className="font-mono text-[12px] text-gray-600">
                    {selectedCertificate.id}
                  </span>
                </Descriptions.Item>
              )}
              {getCertificateIpfsImage(selectedCertificate) && (
                <Descriptions.Item label="IPFS Image">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-gray-600 break-all">
                      {getCertificateIpfsImage(selectedCertificate)}
                    </span>
                    <a
                      href={
                        getIpfsImageUrl(
                          getCertificateIpfsImage(selectedCertificate)
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                      title="View on IPFS"
                    >
                      <ExportOutlined className="text-[14px]" />
                    </a>
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </Fragment>
  );
};

export default certificate;
