import { absoluteUrl } from "@/lib/seo";

export const DATASET_LICENSE_PATH = "/dataset-license/v1" as const;
export const DATASET_LICENSE_NAME = "5GPak Dataset Use Terms v1.0";
export const DATASET_LICENSE_EFFECTIVE_DATE = "2026-08-31";

export function datasetLicenseJsonLd() {
  return {
    "@type": "CreativeWork",
    name: DATASET_LICENSE_NAME,
    url: absoluteUrl(DATASET_LICENSE_PATH),
  };
}
