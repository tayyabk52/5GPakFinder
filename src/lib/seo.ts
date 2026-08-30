import type { Metadata } from "next";

export const SITE_NAME = "5GPak";
export const SITE_ORIGIN = "https://www.5gpakistan.app";
export const SITE_URL = new URL(SITE_ORIGIN);
export const DEFAULT_DESCRIPTION = "Explore Pakistan 5G site locations, network status, community reports, and independent mobile speed-test insights for Jazz, Zong, and Ufone / Onic.";
const SOCIAL_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "5GPak - Pakistan 5G coverage and network insights" };

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  index?: boolean;
};

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function createPageMetadata({ title, description, path, index = true }: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_PK",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SOCIAL_IMAGE.url],
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: true },
  };
}
