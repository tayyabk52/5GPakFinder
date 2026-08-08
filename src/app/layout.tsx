import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import AppShell from "@/components/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "5GPak — Pakistan 5G Coverage & Network Status",
  description: "Pakistan's community 5G coverage map and network-status companion for Jazz, Zong, and Ufone / Onic.",
  keywords: ["Pakistan 5G", "Jazz 5G", "Zong 5G", "Pakistan telecom", "5G coverage map"],
  authors: [{ name: "5GPak" }],
  openGraph: {
    title: "5GPak",
    description: "Pakistan 5G coverage and community network status.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "5GPak",
    description: "Pakistan 5G coverage and community network status.",
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
    </body>
  </html>;
}
