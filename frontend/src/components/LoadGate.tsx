import type { ReactNode } from "react";

/**
 * Shared load-state shape for the page's `useLoad` data hooks. Lives here so
 * both `HomePage` (which owns the hooks) and the category panels (which gate
 * on the states) agree on one type.
 */
export type LoadState<T> =
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly data: T }
  | { readonly kind: "error"; readonly message: string };

export function LoadGate<T>({
  state,
  children,
}: {
  readonly state: LoadState<T>;
  readonly children: (data: T) => ReactNode;
}): ReactNode {
  switch (state.kind) {
    case "loading":
      return (
        <p className="px-1 py-8 text-center text-sm text-label-tertiary">loading…</p>
      );
    case "error":
      return <p className="px-1 py-8 text-center text-sm text-ios-red">{state.message}</p>;
    case "loaded":
      return children(state.data);
  }
}
