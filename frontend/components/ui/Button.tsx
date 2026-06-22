import type { ButtonHTMLAttributes } from "react";

import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

// Pill-shaped reference buttons — accent #EB4425 primary, soft shadow.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#EB4425] text-white shadow-[0_12px_28px_-10px_rgba(235,68,37,0.5)] hover:bg-[#D93719] active:scale-[0.99]",
  secondary:
    "border border-neutral-200 bg-white text-neutral-900 hover:border-neutral-900",
  ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
  danger: "bg-danger-600 text-white hover:brightness-110 shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-7 text-base",
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold outline-none transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
