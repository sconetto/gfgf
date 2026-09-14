import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "gfgf",
  description: "get fit, get fast — weight, lap times, and health in one place",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-health-bg font-sf text-label antialiased">
        {children}
      </body>
    </html>
  );
}
