import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { ContentSection, CoverageHeader, CoveragePageFrame, EvidenceNote, MapAction, Metrics, RelatedLinks, formatCoverageDate } from "@/features/seo-coverage/CoveragePage";
import { getCoverageCities, getCoverageCity, getCoverageReviewFacts } from "@/server/coverage/catalog";
import { absoluteUrl, createPageMetadata } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return getCoverageCities().map((city) => ({ city: city.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = getCoverageCity(slug);
  if (!city) return {};
  return createPageMetadata({ title: `${city.name} 5G Coverage: Jazz, Zong & Ufone`, description: `Check ${city.totalSites} dated Jazz, Zong and Ufone / Onic 5G site records assigned to ${city.name}, with sources, limitations and a searchable map.`, path: `/coverage/${city.slug}` });
}

export default async function CityCoveragePage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = getCoverageCity(slug);
  if (!city) notFound();
  const facts = getCoverageReviewFacts();
  const otherCities = getCoverageCities().filter((item) => item.slug !== city.slug).slice(0, 3);
  const counts = city.operatorCounts;
  return <CoveragePageFrame>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Dataset", name: `${city.name} provider-published 5G site records`, description: `${city.totalSites} records assigned to ${city.name} in the 5GPak ${facts.retrievedAt} snapshot. These are site records, not measured coverage.`, url: absoluteUrl(`/coverage/${city.slug}`), dateModified: facts.reviewedAt, spatialCoverage: { "@type": "City", name: city.name, containedInPlace: { "@type": "Country", name: "Pakistan" } }, variableMeasured: ["Operator", "Site latitude", "Site longitude"], isAccessibleForFree: true }} />
    <CoverageHeader eyebrow="City coverage evidence" title={`${city.name} 5G coverage`} description={`Review ${city.totalSites} provider-published 5G site records assigned to ${city.name}. Use the operator split as a dated source comparison, then search your exact location on the map.`} breadcrumbs={[{ name: "Home", href: "/" }, { name: "Coverage", href: "/coverage" }, { name: city.name, href: `/coverage/${city.slug}` }]} primaryHref={city.mapHref} primaryLabel={`Open ${city.name} map`} />
    <Metrics items={[{ label: "All site records", value: city.totalSites }, { label: "Jazz records", value: counts.Jazz }, { label: "Zong records", value: counts.Zong }, { label: "Ufone / Onic records", value: counts["Ufone / Onic"] }]} />
    <ContentSection title={`Is 5G available in ${city.name}?`}><p>The dataset confirms provider-published 5G site records assigned to {city.name}, led by {city.leadingOperator} in this release. It does not prove blanket city coverage or guarantee service at a home, office or road.</p><p className="mt-3">Kya {city.name} mein 5G available hai? Map par apna exact area aur operator filter karein. Qareebi marker useful evidence hai, lekin signal, speed ya indoor coverage ki guarantee nahin.</p><div className="mt-5"><MapAction href={city.mapHref}>Search {city.name} precisely</MapAction></div></ContentSection>
    <EvidenceNote>Source records were retrieved {formatCoverageDate(facts.retrievedAt)} and reviewed {formatCoverageDate(facts.reviewedAt)}. Counts are not a network quality ranking and can differ from an operator&apos;s current live network.</EvidenceNote>
    <ContentSection title="Operator record breakdown" tone="band"><div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead><tr className="border-b border-slate-300"><th className="py-3">Operator</th><th className="py-3">Records</th><th className="py-3">Evidence page</th></tr></thead><tbody className="divide-y divide-slate-200">{[["Jazz", counts.Jazz, "jazz-5g-coverage"], ["Zong", counts.Zong, "zong-5g-coverage"], ["Ufone / Onic", counts["Ufone / Onic"], "ufone-onic-5g-coverage"]].map(([name, count, path]) => <tr key={name}><th className="py-4">{name}</th><td className="py-4 font-mono">{count}</td><td className="py-4"><a className="font-semibold text-[#126c85] underline underline-offset-2" href={`/operators/${path}`}>Source and city distribution</a></td></tr>)}</tbody></table></div></ContentSection>
    <ContentSection title="What can change the result"><p>Distance alone is not enough. Antenna direction, spectrum, terrain, buildings, congestion, maintenance, handset variant, software, SIM and account eligibility can all affect whether 5G appears and how it performs.</p></ContentSection>
    <ContentSection title="Explore other cities"><RelatedLinks links={otherCities.map((item) => ({ href: `/coverage/${item.slug}`, title: `${item.name} 5G coverage`, text: `${item.totalSites} provider-published site records in this release.` }))} /></ContentSection>
  </CoveragePageFrame>;
}
