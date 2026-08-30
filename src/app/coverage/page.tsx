import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { ContentSection, CoverageHeader, CoveragePageFrame, EvidenceNote, Metrics, RelatedLinks, formatCoverageDate } from "@/features/seo-coverage/CoveragePage";
import { getCoverageCities, getCoverageOperators, getCoverageReviewFacts } from "@/server/coverage/catalog";
import { absoluteUrl, createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "5G Coverage by City in Pakistan",
  description: "Compare dated Jazz, Zong and Ufone / Onic 5G site records for Karachi, Lahore, Islamabad and other major Pakistan cities.",
  path: "/coverage",
});

export default function CoverageHubPage() {
  const cities = getCoverageCities();
  const operators = getCoverageOperators();
  const facts = getCoverageReviewFacts();
  return <CoveragePageFrame>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "5G coverage by city in Pakistan", url: absoluteUrl("/coverage"), dateModified: facts.reviewedAt, mainEntity: { "@type": "ItemList", itemListElement: cities.map((city, index) => ({ "@type": "ListItem", position: index + 1, name: `${city.name} 5G coverage`, url: absoluteUrl(`/coverage/${city.slug}`) })) } }} />
    <CoverageHeader eyebrow="City coverage catalogue" title="5G coverage by city in Pakistan" description={`Explore ${facts.totalSites.toLocaleString("en-PK")} provider-published site records in a dated national snapshot. City totals describe records assigned to that city, not continuous signal coverage.`} breadcrumbs={[{ name: "Home", href: "/" }, { name: "Coverage by city", href: "/coverage" }]} primaryHref="/map" primaryLabel="Search the live map" />
    <Metrics items={[{ label: "Site records", value: facts.totalSites.toLocaleString("en-PK") }, ...operators.map((operator) => ({ label: operator.name, value: operator.totalSites.toLocaleString("en-PK") }))]} />
    <ContentSection title="Major city record counts">
      <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[46rem] text-left text-sm"><thead className="bg-slate-950 text-white"><tr><th className="px-4 py-3">City</th><th className="px-4 py-3">All records</th><th className="px-4 py-3">Jazz</th><th className="px-4 py-3">Zong</th><th className="px-4 py-3">Ufone / Onic</th></tr></thead><tbody className="divide-y divide-slate-200">{cities.map((city) => <tr key={city.slug}><th scope="row" className="px-4 py-4"><Link className="font-bold text-[#126c85] underline underline-offset-2" href={`/coverage/${city.slug}`}>{city.name}</Link></th><td className="px-4 py-4 font-mono font-bold">{city.totalSites}</td><td className="px-4 py-4 font-mono">{city.operatorCounts.Jazz}</td><td className="px-4 py-4 font-mono">{city.operatorCounts.Zong}</td><td className="px-4 py-4 font-mono">{city.operatorCounts["Ufone / Onic"]}</td></tr>)}</tbody></table></div>
      <p className="mt-4">The catalogue includes the largest city groups in this release. Records outside these pages remain available on the national map and in the downloadable GeoJSON.</p>
    </ContentSection>
    <EvidenceNote>Dataset retrieved {formatCoverageDate(facts.retrievedAt)} and provider sources reviewed {formatCoverageDate(facts.reviewedAt)}. A point can be an operator coordinate or an approximate geocode; open its map marker to see the accuracy note.</EvidenceNote>
    <ContentSection title="Browse by operator" tone="band"><RelatedLinks links={operators.map((operator) => ({ href: `/operators/${operator.slug}`, title: `${operator.name} 5G coverage`, text: `${operator.totalSites} source records with city distribution and provenance.` }))} /></ContentSection>
    <ContentSection title="Coverage research and help"><RelatedLinks links={[{ href: "/guides/how-to-check-5g-coverage-pakistan", title: "How to check 5G", text: "A location, device and eligibility checklist." }, { href: "/compare/jazz-vs-zong-5g-pakistan", title: "Jazz vs Zong records", text: "A source-limited city comparison without quality claims." }, { href: "/reports/pakistan-5g-rollout-august-2026", title: "August 2026 report", text: "The dated baseline and provider source audit." }]} /></ContentSection>
  </CoveragePageFrame>;
}
