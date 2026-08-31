import Link from "next/link";
import { LegalLayout, LegalList, LegalSection } from "@/components/LegalDocument";
import { DATASET_LICENSE_EFFECTIVE_DATE, DATASET_LICENSE_NAME } from "@/lib/datasetLicense";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Dataset License",
  description: "Versioned terms for using 5GPak provider-site datasets and reviewed Reddit-derived mobile speed-test metadata.",
  path: "/dataset-license/v1",
});

export default function DatasetLicensePage() {
  return <LegalLayout eyebrow="DATA LICENSE" title={DATASET_LICENSE_NAME} intro={`Effective ${DATASET_LICENSE_EFFECTIVE_DATE}. These terms apply to downloadable and structured datasets published by 5GPak.`}>
    <LegalSection title="1. Scope"><p className="mt-2">This license covers 5GPak&apos;s original selection, review status, normalization, arrangement, derived city grouping, accuracy labels, and other compilation metadata in the provider-site GeoJSON and Reddit speed-test review dataset. It does not transfer ownership of third-party source material.</p></LegalSection>
    <LegalSection title="2. Permitted use"><p className="mt-2">You may download and use the covered compilation metadata for personal research, journalism, education, network analysis, and legitimate internal organisational work, provided that you:</p><LegalList><li>Credit 5GPak and link to the dataset&apos;s canonical page.</li><li>Keep operator, Reddit, and other source attribution attached where supplied.</li><li>Preserve retrieval dates, review states, accuracy labels, and material limitations.</li><li>Do not imply that 5GPak, a source author, Reddit, or a mobile operator endorses your use.</li></LegalList></LegalSection>
    <LegalSection title="3. Third-party material"><p className="mt-2">Operator coordinates, names, pages, KML records, map-source records, Reddit posts, screenshots, and other source content remain subject to the rights and terms of their respective owners. This license does not grant permission to republish Reddit post content, media, operator branding, or any third-party material beyond rights you already have under law or the source&apos;s terms.</p></LegalSection>
    <LegalSection title="4. Restrictions"><LegalList><li>Do not use the data to identify, track, profile, or infer the precise location of a Reddit author, community reporter, subscriber, or device.</li><li>Do not present approximate geocodes, city centroids, reported sites, or sampled measurements as surveyed towers, continuous coverage, guaranteed speed, or current operator-confirmed service.</li><li>Do not remove provenance or use the dataset primarily to clone, resell, or operate a competing copy of 5GPak without written permission.</li><li>Do not use the dataset unlawfully or in a way that infringes third-party rights.</li></LegalList></LegalSection>
    <LegalSection title="5. Changes and archived releases"><p className="mt-2">This is version 1.0 of the dataset-use terms. A downloaded release remains governed by the version linked in its metadata when obtained. Future releases may use an updated license URL or version, which will be stated on their canonical dataset page.</p></LegalSection>
    <LegalSection title="6. No warranty"><p className="mt-2">The datasets are provided for information and research, without a guarantee of accuracy, completeness, current availability, signal, speed, or fitness for a particular purpose. Verify consequential decisions with the relevant operator and original sources.</p></LegalSection>
    <LegalSection title="7. Questions and corrections"><p className="mt-2">For licensing questions, source corrections, or removal concerns, contact <a className="font-semibold text-[#126c85] underline underline-offset-2" href="mailto:privacy@5gpakistan.app">privacy@5gpakistan.app</a>. General platform use remains governed by the <Link className="font-semibold text-[#126c85] underline underline-offset-2" href="/terms">Terms of Use</Link>.</p></LegalSection>
  </LegalLayout>;
}
