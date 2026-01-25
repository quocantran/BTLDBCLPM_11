"use client";

import { LoginForm } from "@/components/molecules";
import { Link } from "@/components/atoms";
import { LoginCardProps } from "./LoginCard.types";
import Image from "next/image";
import { SafetyCertificateOutlined } from "@ant-design/icons";

const LoginCard: React.FC<LoginCardProps> = ({
  onSubmit,
  loading = false,
  error,
  className = "",
}) => {
  return (
    <div
      className={`
      bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-auto
      ${className}
    `}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <Image
          src="/academix-logo-white.png"
          alt="Academix Logo"
          width={64}
          height={64}
          className="mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Sign in</h1>
        <p className="text-gray-500 text-sm lg:text-base">
          Access and explore your Academix portal
        </p>
      </div>

      {/* Form */}
      <LoginForm onSubmit={onSubmit} loading={loading} error={error} />

      {/* Footer */}
      <div className="mt-6 space-y-3 text-center">
        <p className="text-gray-600 text-sm lg:text-base">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium">
            Create one
          </Link>
        </p>
        <div className="pt-3 border-t border-gray-200">
          <Link
            href="/certificate-verify"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm lg:text-base transition-colors duration-200"
          >
            <SafetyCertificateOutlined />
            <span>Verify Certificate</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginCard;
