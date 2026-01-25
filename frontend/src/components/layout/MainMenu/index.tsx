"use client";

import { Menu, MenuProps } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dashboardIcon from "../../../../public/dashboard.svg";
import examIcon from "../../../../public/exams.svg";
import resultIcon from "../../../../public/results.svg";
import studentIcon from "../../../../public/student.svg";
import certificateIcon from "../../../../public/certificate.svg";
import Image from "next/image";

const MainMenu = () => {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      label: "Dashboard",
      link: "/user",
      icon: dashboardIcon,
    },
    {
      label: "Exams",
      link: "/user1",
      icon: examIcon,
    },
    {
      label: "Students",
      link: "/user2",
      icon: studentIcon,
    },
    {
      label: "Results",
      link: "/user3",
      icon: resultIcon,
    },
    {
      label: "Certificates",
      link: "/certificate",
      icon: certificateIcon,
    },
  ];
  const handleOpen: MenuProps["onClick"] = (e) => {
    router.push(e.key as string);
  };

  return (
    <Menu
      className="menu !border-r-0"
      mode="inline"
      items={menuItems.map((item) => ({
        ...item,
        key: item.link,
        icon: (
          <Image
            src={item.icon?.src || dashboardIcon}
            alt={item.label}
            width={20}
            height={20}
          />
        ),
        label: <Link href={item.link}>{item.label}</Link>,
      }))}
      onClick={handleOpen}
      selectedKeys={pathname
        ?.split("/")
        .filter((item) =>
          menuItems.map((item) => item.link).includes(`/${item}`)
        )
        .map((item) => `/${item}`)}
    />
  );
};

export default MainMenu;
