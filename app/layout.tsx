import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { SITE_NAME, siteUrl } from "@/lib/site";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  adjustFontFallback: "Arial",
});

const display = localFont({
  src: "./fonts/Archivo-Variable.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "100 900",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
  adjustFontFallback: "Arial",
});

const mono = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "100 800",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description:
    "Premium mobile polyurethane spray-on protective coatings for vehicles, shipping containers and industrial surfaces.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-hawk-obsidian-bg font-sans text-zinc-300 antialiased">{children}</body>
    </html>
  );
}
