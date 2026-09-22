import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary";

const VARIANT_CLASS: Readonly<Record<Variant, string>> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
};

interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
  external?: boolean;
}

export function ButtonLink({ href, variant = "primary", children, className, external = false }: ButtonLinkProps) {
  const classes = cn("btn chamfer", VARIANT_CLASS[variant], className);
  if (external) {
    return (
      <a href={href} className={classes} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={cn("btn chamfer", VARIANT_CLASS[variant], className)} {...rest} />;
}
