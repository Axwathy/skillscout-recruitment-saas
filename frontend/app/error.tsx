"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for monitoring (Sentry hook point).
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md rounded-[24px] border border-neutral-200/70 bg-white p-10 shadow-glass">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EB4425]/10 text-[#EB4425]">
          <TriangleAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-neutral-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          An unexpected error occurred. You can try again, or head back to safety.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-neutral-400">Ref: {error.digest}</p>
        )}
        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-[#EB4425] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-8px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719]"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-900"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
