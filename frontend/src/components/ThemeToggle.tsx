"use client";

import type { ReactElement } from "react";

import { MoonGlyph, SunGlyph } from "@/components/icons";

const THEME_STORAGE_KEY = "gfgf-theme";

/**
 * Sun/moon theme toggle. Both glyphs are rendered and swapped purely via the
 * `.dark` class (see the rules in globals.css), so there is no hydration
 * mismatch and no flash — the boot script in layout.tsx has already applied
 * the class before first paint.
 */
export function ThemeToggle(): ReactElement {
  function toggle(): void {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private mode) — the toggle still works.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-separator bg-card text-label-secondary transition-colors hover:text-label focus:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/40"
    >
      <SunGlyph className="theme-toggle-sun h-4 w-4" />
      <MoonGlyph className="theme-toggle-moon h-4 w-4" />
    </button>
  );
}
