import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChamferCardProps {
  children: ReactNode;
  featured?: boolean;
  className?: string;
  innerClassName?: string;
}

export function ChamferCard({ children, featured = false, className, innerClassName }: ChamferCardProps) {
  return (
    <div className={cn("chamfer-2 plate", featured && "plate-featured", className)}>
      <div className={cn("chamfer-2 plate-inner", innerClassName)}>{children}</div>
    </div>
  );
}
