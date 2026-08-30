import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: "Pakistan 5G Coverage Map & Network Status | 5GPak",
    template: "%s | 5GPak",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  formatDetection: { address: false, email: false, telephone: false },
  openGraph: {
    title: "Pakistan 5G Coverage Map & Network Status",
    description: DEFAULT_DESCRIPTION,
    type: "website",
    locale: "en_PK",
    siteName: SITE_NAME,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pakistan 5G Coverage Map & Network Status",
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1D1D1D",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <head>
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    </head>
    <body className={`${inter.variable} bg-gray-50 font-sans text-gray-900 antialiased`}>
      <AppShell>{children}</AppShell>
      <Analytics />
      <SpeedInsights />
    </body>
  </html>;
}
