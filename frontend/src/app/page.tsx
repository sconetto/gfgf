"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { fetchHealth, type HealthStatus } from "@/lib/api";

type HealthState =
  | { readonly kind: "loading" }
  | { readonly kind: "healthy"; readonly health: HealthStatus }
  | { readonly kind: "unreachable"; readonly message: string };

export default function HomePage() {
  const [healthState, setHealthState] = useState<HealthState>({
    kind: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((health) => {
        setHealthState({ kind: "healthy", health });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setHealthState({ kind: "unreachable", message });
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <header className="flex flex-col items-center gap-3">
        <h1 className="text-7xl font-bold tracking-tighter">gfgf</h1>
        <p className="text-lg text-neutral-400">get fit, get fast</p>
      </header>
      <HealthBadge state={healthState} />
    </main>
  );
}

function HealthBadge({
  state,
}: {
  readonly state: HealthState;
}): ReactElement {
  switch (state.kind) {
    case "loading":
      return (
        <span className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-400">
          checking backend…
        </span>
      );
    case "healthy":
      return (
        <span className="rounded-full border border-emerald-700 bg-emerald-950 px-4 py-2 text-sm text-emerald-300">
          backend {state.health.status} · db {state.health.db}
        </span>
      );
    case "unreachable":
      return (
        <span className="rounded-full border border-red-800 bg-red-950 px-4 py-2 text-sm text-red-300">
          backend unreachable ({state.message})
        </span>
      );
  }
}
