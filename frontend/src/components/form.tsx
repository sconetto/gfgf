import type { ReactElement, ReactNode } from "react";

/** iOS-style form primitives: gray filled inputs, small gray labels, filled accent button. */

export const inputClass =
  "w-full rounded-[10px] bg-health-bg px-3 py-2 text-sm text-label placeholder:text-label-tertiary focus:outline-none focus:ring-2 focus:ring-ios-blue/40";

export type FormStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "saved"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  readonly label: string;
  readonly htmlFor: string;
  readonly hint?: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-label-secondary">
        {label}
      </label>
      {children}
      {hint === undefined ? null : (
        <p className="text-xs text-label-tertiary">{hint}</p>
      )}
    </div>
  );
}

export type SubmitAccent = "blue" | "green" | "teal";

export function SubmitButton({
  disabled,
  accent = "blue",
  children,
}: {
  readonly disabled: boolean;
  readonly accent?: SubmitAccent;
  readonly children: ReactNode;
}): ReactElement {
  const accentClass =
    accent === "green"
      ? "bg-ios-green hover:bg-ios-green/90"
      : accent === "teal"
        ? "bg-ios-teal hover:bg-ios-teal/90"
        : "bg-ios-blue hover:bg-ios-blue/90";
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`rounded-full px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${accentClass}`}
    >
      {children}
    </button>
  );
}

export function StatusLine({
  status,
}: {
  readonly status: FormStatus;
}): ReactElement | null {
  switch (status.kind) {
    case "idle":
      return null;
    case "submitting":
      return <p className="text-xs text-label-tertiary">saving…</p>;
    case "saved":
      return <p className="text-xs font-medium text-ios-green">{status.message}</p>;
    case "error":
      return <p className="text-xs font-medium text-ios-red">{status.message}</p>;
  }
}
