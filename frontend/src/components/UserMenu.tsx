"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import { Avatar, Dropdown, Space, Tag } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { clearAuth } from "@/services/utils/auth.utils";

export function UserMenu() {
  const router = useRouter();
  const { user, clearUser } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    clearAuth();
    clearUser();
    router.push("/login");
  };

  const items: MenuProps["items"] = [
    {
      key: "profile",
      label: "Student Profile",
      icon: <UserOutlined />,
      onClick: () => router.push("/profile"),
    },
    {
      key: "settings",
      label: "Settings",
      icon: <SettingOutlined />,
      onClick: () => router.push("/settings"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight" arrow>
      <Space className="cursor-pointer hover:opacity-80">
        <Avatar icon={<UserOutlined />} />
        <div className="hidden md:block">
          <div className="text-sm font-medium">{user.username}</div>
          <Tag
            color={user.role === "teacher" ? "blue" : "green"}
            className="text-xs"
          >
            {user.role === "teacher" ? "Giáo viên" : "Sinh viên"}
          </Tag>
        </div>
      </Space>
    </Dropdown>
  );
}
