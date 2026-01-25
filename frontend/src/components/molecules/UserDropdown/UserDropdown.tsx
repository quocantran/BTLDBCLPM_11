"use client";

import React from "react";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/atoms";
import { useAuth } from "@/stores/auth";
import { clearAuth } from "@/services/utils/auth.utils";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";

export const UserDropdown: React.FC = () => {
  const router = useRouter();
  const { user, clearUser } = useAuth();

  const handleLogout = () => {
    clearAuth();
    clearUser();
    router.push("/login");
  };

  const handleProfile = () => {
    router.push("/profile");
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "profile",
      label: "Profile",
      icon: <UserOutlined />,
      onClick: handleProfile,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
      danger: true,
    },
  ];

  // Generate avatar URL from user email
  const avatarSrc = user?.imageUrl
    ? user?.imageUrl
    : user?.email
    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
    : undefined;

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      placement="bottomRight"
      arrow
    >
      <div className="cursor-pointer">
        <Avatar src={avatarSrc} size="medium" />
      </div>
    </Dropdown>
  );
};
