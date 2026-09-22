import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const ROUTES = ["", "/capabilities", "/pricing", "/contact"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ROUTES.map((route) => ({ url: `${base}${route}`, changeFrequency: "monthly", priority: route === "" ? 1 : 0.7 }));
}
