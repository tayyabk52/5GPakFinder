import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { ContentSection, CoverageHeader, CoveragePageFrame, EvidenceNote, Metrics, RelatedLinks, SourceLink, formatCoverageDate } from "@/features/seo-coverage/CoveragePage";
import { getCoverageOperator, getCoverageOperators, getCoverageReviewFacts } from "@/server/coverage/catalog";
import { absoluteUrl, createPageMetadata } from "@/lib/seo";
import { DATASET_LICENSE_NAME, DATASET_LICENSE_PATH, datasetLicenseJsonLd } from "@/lib/datasetLicense";

export const dynamicParams = false;
export function generateStaticParams() { return getCoverageOperators().map((operator) => ({ operator: operator.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ operator: string }> }) {
  const { operator: slug } = await params;
  const operator = getCoverageOperator(slug);
  if (!operator) return {};
  return createPageMetadata({ title: `${operator.name} 5G Coverage in Pakistan`, description: `Review ${operator.totalSites} ${operator.name} 5G site records in the dated 5GPak release, with city distribution, source provenance and limitations.`, path: `/operators/${operator.slug}` });
}

export default async function OperatorCoveragePage({ params }: { params: Promise<{ operator: string }> }) {
  const { operator: slug } = await params;
  const operator = getCoverageOperator(slug);
  if (!operator) notFound();
  const facts = getCoverageReviewFacts();
  const listedCities = operator.cityCounts.filter((item) => item.slug);
  return <CoveragePageFrame>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Dataset", name: `${operator.name} provider-published 5G site records in Pakistan`, description: `${operator.totalSites} records from ${operator.sourceName}, retained in a dated independent map release.`, url: absoluteUrl(`/operators/${operator.slug}`), dateModified: facts.reviewedAt, spatialCoverage: { "@type": "Country", name: "Pakistan" }, isBasedOn: operator.sourceUrl, isAccessibleForFree: true, license: datasetLicenseJsonLd() }} />
    <CoverageHeader eyebrow="Operator source catalogue" title={`${operator.name} 5G coverage in Pakistan`} description={`This release contains ${operator.totalSites} ${operator.name} site records. The page shows where records are grouped and how their source was reviewed; it does not grade network quality or guarantee signal.`} breadcrumbs={[{ name: "Home", href: "/" }, { name: "Coverage", href: "/coverage" }, { name: operator.name, href: `/operators/${operator.slug}` }]} primaryHref="/map" primaryLabel={`View ${operator.name} on the map`} />
    <Metrics items={[{ label: `${operator.name} records`, value: operator.totalSites }, { label: "Dataset total", value: facts.totalSites }, { label: "Cities with records", value: operator.cityCounts.filter((item) => item.city !== "Location not classified").length }, { label: "Source reviewed", value: formatCoverageDate(facts.reviewedAt) }]} />
    <ContentSection title="Source and accuracy"><p><SourceLink href={operator.sourceUrl}>{operator.sourceName}</SourceLink></p><p className="mt-3">{operator.accuracy}</p><div className="mt-5"><EvidenceNote>{operator.sourceReview}</EvidenceNote></div></ContentSection>
    <ContentSection title="Records by city" tone="band"><div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead><tr className="border-b border-slate-300"><th className="py-3">City group</th><th className="py-3">Records</th><th className="py-3">City evidence</th></tr></thead><tbody className="divide-y divide-slate-200">{operator.cityCounts.map((item) => <tr key={item.city}><th className="py-4">{item.city}</th><td className="py-4 font-mono">{item.count}</td><td className="py-4">{item.slug ? <Link href={`/coverage/${item.slug}`} className="font-semibold text-[#126c85] underline underline-offset-2">Open city page</Link> : <span className="text-slate-500">Map only</span>}</td></tr>)}</tbody></table></div></ContentSection>
    <ContentSection title="How to interpret these records"><p>The total counts records in the {formatCoverageDate(facts.retrievedAt)} snapshot. It is not the operator&apos;s current live-site total, population coverage, subscriber reach, median speed or service-quality score. Search the exact location and confirm the handset and account with the operator.</p><p className="mt-3">Dataset use is governed by <Link href={DATASET_LICENSE_PATH} className="font-semibold text-[#126c85] underline underline-offset-2">{DATASET_LICENSE_NAME}</Link>.</p></ContentSection>
    <ContentSection title="Explore city evidence"><RelatedLinks links={listedCities.slice(0, 6).map((item) => ({ href: `/coverage/${item.slug}`, title: `${item.city} 5G coverage`, text: `${item.count} ${operator.name} records in this release.` }))} /></ContentSection>
  </CoveragePageFrame>;
}
