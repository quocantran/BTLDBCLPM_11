import React from "react";
import Image from "next/image";

export const Logo: React.FC<{
  className?: string;
  collapsed?: boolean;
  onClick?: () => void;
}> = ({ className = "", collapsed = false, onClick }) => {
  return (
    <div
      className={`flex cursor-pointer items-center justify-center ${
        collapsed ? "" : "space-x-2"
      } ${className}`}
      onClick={onClick}
    >
      <Image
        src="/academix-logo-white.png"
        alt="Academix Logo"
        width={34}
        height={34}
        className="h-auto w-auto"
        priority
      />
      {!collapsed && (
        <span className="text-2xl font-semibold text-gray-800">Academix</span>
      )}
    </div>
  );
};
