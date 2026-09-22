import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  id?: string;
  title: string;
  children?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({ id, title, children, as = "h2", className }: SectionHeadingProps) {
  const Tag = as;
  return (
    <div className={cn(as === "h1" ? "max-w-5xl" : "max-w-3xl", className)}>
      <div className="mb-6 h-px w-14 bg-hawk-crimson" aria-hidden />
      <Tag
        id={id}
        className={cn(
          "display-wide text-chrome",
          as === "h1" ? "text-[clamp(1.6rem,6vw,3.75rem)]" : "text-[clamp(1.5rem,3.6vw,2.75rem)]",
        )}
      >
        {title}
      </Tag>
      {children ? <div className="mt-5 max-w-[62ch] text-lg text-zinc-400">{children}</div> : null}
    </div>
  );
}
