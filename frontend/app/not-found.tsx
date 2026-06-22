import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md rounded-[24px] border border-neutral-200/70 bg-white p-10 shadow-glass">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EB4425]/10 text-[#EB4425]">
          <Compass className="h-7 w-7" />
        </div>
        <p className="mt-5 text-5xl font-bold tracking-tight text-neutral-900">404</p>
        <h1 className="mt-2 text-lg font-semibold text-neutral-900">Page not found</h1>
        <p className="mt-2 text-sm text-neutral-500">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-[#EB4425] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_28px_-8px_rgba(235,68,37,0.5)] transition-all hover:bg-[#D93719]"
          >
            Back home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-900"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
