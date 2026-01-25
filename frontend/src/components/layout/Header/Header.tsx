"use client";

import { Avatar, Divider, Popover, Space } from "antd";
import { UserOutlined } from "@ant-design/icons";

export const Header = () => {
  const content = (
    <div className="min-w-[200px]">
      <Space>
        <Avatar size={20} icon={<UserOutlined />} />
        <span>Account</span>
      </Space>
      <Divider className="!my-3" />
      <div>My profile</div>
      <Divider className="!my-3" />
      <div>Logout</div>
    </div>
  );
  return (
    <header className="py-3 px-10 flex justify-end">
      <Popover
        content={content}
        title={null}
        trigger={["click"]}
        arrow={false}
        className="profile"
      >
        <Space>
          <span className="username">username</span>
          <Avatar size={40} icon={<UserOutlined />} />
        </Space>
      </Popover>
    </header>
  );
};
