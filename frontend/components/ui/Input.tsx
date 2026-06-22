import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { clsx } from "clsx";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

// Minimalist field with subtle glass fill; focus shifts the border to near-black.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          "h-11 rounded-xl border bg-white/70 px-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400",
          "focus:border-neutral-900 focus:bg-white",
          error ? "border-danger-600" : "border-neutral-200",
          className,
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? (
        <p className="text-xs font-medium text-danger-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-neutral-500">{hint}</p>
      ) : null}
    </div>
  );
});
