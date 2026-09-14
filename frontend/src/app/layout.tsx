import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "gfgf",
  description: "get fit, get fast — weight, lap times, and health in one place",
};

/**
 * Pre-hydration theme boot: applies the persisted choice (localStorage
 * "gfgf-theme") or the OS preference onto <html> as a `.dark` class before
 * first paint, so the CSS-variable tokens resolve correctly from the start.
 * Rendered as the first element of <body> — an inline script there runs
 * synchronously during parsing, before any content hydrates or paints.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem("gfgf-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-health-bg font-sf text-label antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
