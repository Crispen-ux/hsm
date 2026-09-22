import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  errors?: readonly string[];
  children: ReactNode;
  className?: string;
}

export function Field({ id, label, hint, errors, children, className }: FieldProps) {
  const hasError = errors !== undefined && errors.length > 0;
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="block text-sm text-zinc-300">
        {label}
        {hint ? <span className="ml-2 text-zinc-400">{hint}</span> : null}
      </label>
      {children}
      {hasError ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-hawk-gold">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
