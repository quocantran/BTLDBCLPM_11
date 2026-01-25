import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "antd/dist/reset.css";
import { Web3Providers } from "@/lib/providers";
import { AuthProvider } from "@/providers/AuthProvider";
import { AntdProvider } from "@/providers/AntdProvider";

import "../styles/style.scss";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hệ thống thi và cấp chứng chỉ",
  description:
    "Ứng dụng Web3 với các chức năng kết nối ví, xem số dư và chuyển đổi chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Providers>
          <AntdProvider>
            <AuthProvider>{children}</AuthProvider>
          </AntdProvider>
        </Web3Providers>
      </body>
    </html>
  );
}
