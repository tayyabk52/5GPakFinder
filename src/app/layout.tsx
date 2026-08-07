import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pakistan 5G Map — Jazz & Zong Coverage",
  description:
    "Interactive map of 5G cell sites across Pakistan, including Jazz and Zong networks. Provider-published coordinates from official map sources.",
  keywords: ["Pakistan 5G", "Jazz 5G", "Zong 5G", "Pakistan telecom", "5G coverage map"],
  authors: [{ name: "Pakistan 5G Map" }],
  openGraph: {
    title: "Pakistan 5G Map",
    description: "Interactive map of 5G cell sites across Pakistan — Jazz and Zong networks.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pakistan 5G Map",
    description: "Interactive map of 5G cell sites across Pakistan — Jazz and Zong networks.",
  },
};

// Next.js 15+ requires viewport/themeColor in a separate export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
