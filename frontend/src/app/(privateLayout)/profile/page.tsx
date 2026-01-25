"use client";

import { useAuth } from "@/stores/auth";
import {
  Card,
  Descriptions,
  Tag,
  Spin,
  Button,
  Space,
  message,
  Avatar,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  IdcardOutlined,
  CalendarOutlined,
  CameraOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import EditProfileModal from "./EditProfileModal";
import ChangePasswordModal from "./ChangePasswordModal";
import UploadImage from "./UploadImage";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [isOpenEditProfileModal, setIsOpenEditProfileModal] =
    useState<boolean>(false);
  const [isOpenChangePasswordModal, setIsOpenChangePasswordModal] =
    useState<boolean>(false);
  const [isOpenUploadImageModal, setIsOpenUploadImageModal] =
    useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large"></Spin>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <Space direction="vertical" size="large" align="center">
            <span>User not found.</span>
            <Button type="primary" href="/login">
              Đăng nhập lại
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div className="bg-gray-50 py-3">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="md:text-4xl text-3xl font-bold !mb-0 text-gray-900">
              Student Profile
            </h1>
            <div className="flex gap-2">
              <Button
                block
                size="middle"
                icon={<UserOutlined />}
                onClick={() => setIsOpenEditProfileModal(true)}
                className="flex items-center justify-center gap-2"
              >
                Edit Personal Information
              </Button>
              <Button
                block
                size="middle"
                icon={<IdcardOutlined />}
                onClick={() => setIsOpenChangePasswordModal(true)}
                className="flex items-center justify-center gap-2"
              >
                Change Password
              </Button>
            </div>
          </div>

          <Card
            title={
              <Space>
                <UserOutlined />
                <span>Personal Information</span>
              </Space>
            }
            className="shadow-md"
          >
            {/* Avatar Section */}
            <div className="mb-6 flex flex-col items-center gap-4 border-b border-slate-200 pb-6">
              <Avatar
                size={160}
                src={user?.imageUrl}
                icon={!user?.imageUrl && <UserOutlined />}
                className="ring-4 ring-slate-100 shadow-lg"
              />
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setIsOpenUploadImageModal(true)}
              >
                <Button
                  type="primary"
                  shape="circle"
                  size="large"
                  icon={<CameraOutlined />}
                  className="absolute bottom-0 right-0 shadow-lg"
                />
                <span className="text-sm text-gray-500">
                  Update your image profile
                </span>
              </div>
            </div>

            <Descriptions column={1} bordered>
              <Descriptions.Item
                label={
                  <Space>
                    <IdcardOutlined />
                    <span>ID</span>
                  </Space>
                }
              >
                {user?.id}
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space>
                    <UserOutlined />
                    <span>Username</span>
                  </Space>
                }
              >
                {user?.username}
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space>
                    <UserOutlined />
                    <span>Full Name</span>
                  </Space>
                }
              >
                {user?.fullName || "--"}
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space>
                    <CalendarOutlined />
                    <span>Date of Birth</span>
                  </Space>
                }
              >
                {user?.dateOfBirth
                  ? new Date(user.dateOfBirth).toLocaleDateString()
                  : "--"}
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space>
                    <MailOutlined />
                    <span>Email</span>
                  </Space>
                }
              >
                {user?.email}
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space>
                    <IdcardOutlined />
                    <span>Citizen ID</span>
                  </Space>
                }
              >
                {user?.citizenId || "--"}
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space>
                    <IdcardOutlined />
                    <span>Role</span>
                  </Space>
                }
              >
                <Tag color={user?.role === "teacher" ? "blue" : "green"}>
                  {user?.role === "teacher" ? "Teacher" : "Student"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        {isOpenEditProfileModal && (
          <EditProfileModal
            isOpen={isOpenEditProfileModal}
            onClose={() => setIsOpenEditProfileModal(false)}
            onSuccess={() => {}}
          />
        )}

        {isOpenChangePasswordModal && (
          <ChangePasswordModal
            isOpen={isOpenChangePasswordModal}
            onClose={() => setIsOpenChangePasswordModal(false)}
            onSuccess={() => {
              console.log("Password changed successfully!");
              messageApi.success("Password changed successfully!");
            }}
            onError={(error) => {
              messageApi.error(error);
            }}
          />
        )}
        {isOpenUploadImageModal && (
          <UploadImage
            isOpen={isOpenUploadImageModal}
            onClose={() => setIsOpenUploadImageModal(false)}
            currentImageUrl={user?.imageUrl}
            onUploadSuccess={() => {
              messageApi.success("Avatar updated successfully!");
            }}
          />
        )}
      </div>
    </>
  );
}
