"use client";
import SearchFilter, {
  SearchFilterType,
} from "@/components/certificate/SearchFilter";
import { Col, Divider, Flex, Row, Spin, Alert } from "antd";
import Image from "next/image";
import { useState } from "react";
import dayjs from "dayjs";
import {
  ExportOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import Link from "next/link";

interface CertificateVerifyResponse {
  success: boolean;
  data: {
    valid: boolean;
    message: string;
    certificate: {
      id: string;
      student: {
        _id: string;
        username: string;
        email: string;
        fullName: string;
        role: string;
      };
      course: {
        _id: string;
        courseName: string;
      };
      submission: {
        _id: string;
        score: number;
        submittedAt: string;
      };
      status: string;
      tokenId: string;
      ipfsHash: string;
      ipfsImage?: string;
      imageUrl?: string;
      transactionHash: string;
      issuedAt: string;
      outdateTime: string;
    };
    blockchainVerification: {
      valid: boolean;
      tokenId: string;
      cid: string;
      issuer: string;
      recipient: string;
    };
  };
  message: string;
  meta: {
    timestamp: string;
  };
}

const certificateVerify = () => {
  const [tokenId, setTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyResult, setVerifyResult] =
    useState<CertificateVerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!tokenId.trim()) {
      setError("Please enter a certificate ID or verification code");
      return;
    }

    setLoading(true);
    setError(null);
    setVerifyResult(null);

    try {
      const apiEndpoint =
        process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:8000";
      const response = await fetch(
        `${apiEndpoint}/public/certificates/verify/token/${tokenId.trim()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data: CertificateVerifyResponse = await response.json();

      if (response.ok && data.success) {
        setVerifyResult(data);
      } else {
        setError(data.message || "Failed to verify certificate");
      }
    } catch (err: any) {
      setError(
        err.message || "An error occurred while verifying the certificate"
      );
    } finally {
      setLoading(false);
    }
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

  // Get certificate image URL (prioritize direct URL, then ipfsImage, then ipfsHash)
  const getCertificateImageUrl = (certificate: any): string | null => {
    // Check if there's a direct image URL from database
    if (certificate?.imageUrl) {
      // If it's already a full URL (http/https), return it directly
      if (
        certificate.imageUrl.startsWith("http://") ||
        certificate.imageUrl.startsWith("https://")
      ) {
        return certificate.imageUrl;
      }
      // If it's a relative path, construct full URL
      const apiEndpoint =
        process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:8000";
      return `${apiEndpoint}${certificate.imageUrl.startsWith("/") ? "" : "/"}${
        certificate.imageUrl
      }`;
    }

    // Check for ipfsImage field
    if (certificate?.ipfsImage) {
      // If ipfsImage is already a URL, return it
      if (
        certificate.ipfsImage.startsWith("http://") ||
        certificate.ipfsImage.startsWith("https://")
      ) {
        return certificate.ipfsImage;
      }
      // Otherwise, treat it as IPFS hash
      return getIpfsImageUrl(certificate.ipfsImage);
    }

    // Fallback to ipfsHash
    if (certificate?.ipfsHash) {
      return getIpfsImageUrl(certificate.ipfsHash);
    }

    return null;
  };

  const certificate = verifyResult?.data?.certificate;
  const blockchainVerification = verifyResult?.data?.blockchainVerification;
  const isValid = verifyResult?.data?.valid;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8 px-4 flex-1">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          {/* Login Link */}
          <div className="flex justify-end mb-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-blue-200"
            >
              <LoginOutlined className="text-lg" />
              <span>Login</span>
            </Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Academix
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2">
            Certificate Verification
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Verify the authenticity of a blockchain-issued certificate using the
            certificate ID or verification code.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8 mb-6 transition-all duration-300 hover:shadow-xl">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Certificate ID or Verification Code
            </label>
            <Flex gap={16} className="flex-col sm:flex-row">
              <div className="flex-1">
                <SearchFilter
                  type={SearchFilterType.SEARCH_INPUT}
                  placeholder="Enter the code from the certificate"
                  value={tokenId}
                  onChange={(v) => setTokenId(v as string)}
                  onEnter={() => handleVerify()}
                  className="h-12"
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg px-8 py-3 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spin size="small" />
                    Verifying...
                  </span>
                ) : (
                  "Verify Certificate"
                )}
              </button>
            </Flex>
          </div>

          {error && (
            <Alert
              message="Verification Failed"
              description={error}
              type="error"
              showIcon
              className="mt-4 rounded-lg"
              closable
              onClose={() => setError(null)}
            />
          )}
        </div>

        {/* Result Section */}
        {verifyResult && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8 animate-fadeIn">
            {/* Status Badge */}
            <div
              className={`flex items-center justify-center gap-3 mb-6 p-4 rounded-xl ${
                isValid
                  ? "bg-green-50 border-2 border-green-200"
                  : "bg-red-50 border-2 border-red-200"
              }`}
            >
              {isValid ? (
                <>
                  <CheckCircleOutlined className="text-green-600 text-3xl animate-bounce" />
                  <span className="text-green-700 text-xl font-bold">
                    Certificate Verified ✓
                  </span>
                </>
              ) : (
                <>
                  <CloseCircleOutlined className="text-red-600 text-3xl" />
                  <span className="text-red-700 text-xl font-bold">
                    Certificate Invalid ✗
                  </span>
                </>
              )}
            </div>

            {certificate && (
              <>
                {/* Certificate Image */}
                {getCertificateImageUrl(certificate) && (
                  <div className="mb-8 flex justify-center">
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                      <div className="relative bg-white p-4 rounded-xl shadow-xl">
                        <Image
                          src={getCertificateImageUrl(certificate) || ""}
                          alt="Certificate"
                          width={500}
                          height={375}
                          className="rounded-lg object-contain"
                          style={{ maxHeight: "500px", maxWidth: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Certificate Information */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                    Certificate Information
                  </h3>
                  <Row gutter={[16, 20]}>
                    <Col xs={24} sm={12}>
                      <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                          Course Name
                        </p>
                        <p className="text-gray-900 text-base font-semibold">
                          {certificate.course.courseName}
                        </p>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                          Student Name
                        </p>
                        <p className="text-gray-900 text-base font-semibold">
                          {certificate.student.fullName}
                        </p>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                          Student Email
                        </p>
                        <p className="text-gray-900 text-base font-semibold break-all">
                          {certificate.student.email}
                        </p>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                          Score
                        </p>
                        <p className="text-gray-900 text-2xl font-bold">
                          {certificate.submission.score}
                        </p>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                          Status
                        </p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            certificate.status.toLowerCase() === "issued"
                              ? "bg-green-100 text-green-800"
                              : certificate.status.toLowerCase() === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {certificate.status}
                        </span>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                          Token ID
                        </p>
                        <p className="text-gray-900 text-sm font-mono break-all">
                          {certificate.tokenId}
                        </p>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                          Date Issued
                        </p>
                        <p className="text-gray-900 text-base font-semibold">
                          {dayjs(certificate.issuedAt).format("DD-MM-YYYY")}
                        </p>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200 hover:border-blue-300 transition-colors">
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
                          Submitted At
                        </p>
                        <p className="text-gray-900 text-base font-semibold">
                          {dayjs(certificate.submission.submittedAt).format(
                            "DD-MM-YYYY"
                          )}
                        </p>
                      </div>
                    </Col>
                    {certificate.transactionHash && (
                      <Col xs={24}>
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                            Transaction Hash
                          </p>
                          <div className="flex items-start gap-2">
                            <p className="text-gray-900 text-sm font-mono break-all flex-1">
                              {certificate.transactionHash}
                            </p>
                            <a
                              href={`https://testnet.snowtrace.io/tx/${certificate.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0 mt-1"
                              title="View on Blockchain"
                            >
                              <ExportOutlined className="text-lg" />
                            </a>
                          </div>
                        </div>
                      </Col>
                    )}
                    {certificate.imageUrl && (
                      <Col xs={24}>
                        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                            Image URL
                          </p>
                          <div className="flex items-start gap-2">
                            <p className="text-gray-900 text-sm font-mono break-all flex-1">
                              {certificate.imageUrl}
                            </p>
                            <a
                              href={getCertificateImageUrl(certificate) || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0 mt-1"
                              title="View Image"
                            >
                              <ExportOutlined className="text-lg" />
                            </a>
                          </div>
                        </div>
                      </Col>
                    )}
                    {certificate.ipfsHash &&
                      !certificate.imageUrl &&
                      !certificate.ipfsImage && (
                        <Col xs={24}>
                          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                              IPFS Hash
                            </p>
                            <div className="flex items-start gap-2">
                              <p className="text-gray-900 text-sm font-mono break-all flex-1">
                                {certificate.ipfsHash}
                              </p>
                              <a
                                href={
                                  getIpfsImageUrl(certificate.ipfsHash) || "#"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0 mt-1"
                                title="View on IPFS"
                              >
                                <ExportOutlined className="text-lg" />
                              </a>
                            </div>
                          </div>
                        </Col>
                      )}
                  </Row>
                </div>

                {/* Blockchain Verification Section */}
                {blockchainVerification && (
                  <div className="mt-8 pt-6 border-t-2 border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                      Blockchain Verification
                    </h3>
                    <Row gutter={[16, 20]}>
                      <Col xs={24} sm={12}>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 h-full border-2 border-green-200">
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                            Valid on Blockchain
                          </p>
                          <p
                            className={`text-lg font-bold ${
                              blockchainVerification.valid
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {blockchainVerification.valid ? "✓ Yes" : "✗ No"}
                          </p>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200">
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                            IPFS CID
                          </p>
                          <p className="text-gray-900 text-sm font-mono break-all">
                            {blockchainVerification.cid}
                          </p>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200">
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                            Issuer
                          </p>
                          <p className="text-gray-900 text-sm font-mono break-all">
                            {blockchainVerification.issuer}
                          </p>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="bg-gray-50 rounded-lg p-4 h-full border border-gray-200">
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                            Recipient
                          </p>
                          <p className="text-gray-900 text-sm font-mono break-all">
                            {blockchainVerification.recipient}
                          </p>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default certificateVerify;
