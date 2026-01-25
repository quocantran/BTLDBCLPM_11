import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {/* <Header /> */}
      <main className="flex min-h-[100vh] bg-[#f0f2f4] justify-center">
        {children}
      </main>
    </>
  );
};

export default Layout;
