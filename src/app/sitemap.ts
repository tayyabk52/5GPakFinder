import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const UPDATED = new Date("2026-08-30T00:00:00+05:00");

const routes = [
  "/",
  "/5g-coverage-map-pakistan",
  "/map",
  "/insights",
  "/insights/reddit-speedtests",
  "/network-status",
  "/network-history",
  "/methodology",
  "/about",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({ url: absoluteUrl(route), lastModified: UPDATED }));
}
