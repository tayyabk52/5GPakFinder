import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { ContentSection, CoverageHeader, CoveragePageFrame, EvidenceNote, Metrics, RelatedLinks, formatCoverageDate } from "@/features/seo-coverage/CoveragePage";
import { getCoverageCities, getCoverageOperators, getCoverageReviewFacts } from "@/server/coverage/catalog";
import { absoluteUrl, createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({ title: "Jazz vs Zong 5G Coverage Records in Pakistan", description: "Compare dated Jazz and Zong provider-published 5G site records by major Pakistan city, with sources and clear limitations.", path: "/compare/jazz-vs-zong-5g-pakistan" });

export default function JazzVsZongPage() {
  const cities = getCoverageCities();
  const operators = getCoverageOperators();
  const jazz = operators.find((item) => item.name === "Jazz")!;
  const zong = operators.find((item) => item.name === "Zong")!;
  const facts = getCoverageReviewFacts();
  return <CoveragePageFrame>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", name: "Jazz vs Zong 5G coverage records in Pakistan", url: absoluteUrl("/compare/jazz-vs-zong-5g-pakistan"), dateModified: facts.reviewedAt }} />
    <CoverageHeader eyebrow="Source record comparison" title="Jazz vs Zong 5G coverage records in Pakistan" description="Compare the two operator datasets retained in the same dated 5GPak release. The result describes published records, not which network is faster or better." breadcrumbs={[{ name: "Home", href: "/" }, { name: "Coverage", href: "/coverage" }, { name: "Jazz vs Zong", href: "/compare/jazz-vs-zong-5g-pakistan" }]} primaryHref="/map" primaryLabel="Compare on the map" />
    <Metrics items={[{ label: "Jazz records", value: jazz.totalSites }, { label: "Zong records", value: zong.totalSites }, { label: "Combined records", value: jazz.totalSites + zong.totalSites }, { label: "Snapshot retrieved", value: formatCoverageDate(facts.retrievedAt) }]} />
    <ContentSection title="City-by-city records"><div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[36rem] text-left text-sm"><thead className="bg-slate-950 text-white"><tr><th className="px-4 py-3">City</th><th className="px-4 py-3">Jazz</th><th className="px-4 py-3">Zong</th><th className="px-4 py-3">Difference</th></tr></thead><tbody className="divide-y divide-slate-200">{cities.map((city) => <tr key={city.slug}><th className="px-4 py-4"><Link href={`/coverage/${city.slug}`} className="font-bold text-[#126c85] underline underline-offset-2">{city.name}</Link></th><td className="px-4 py-4 font-mono">{city.operatorCounts.Jazz}</td><td className="px-4 py-4 font-mono">{city.operatorCounts.Zong}</td><td className="px-4 py-4 font-mono">{Math.abs(city.operatorCounts.Jazz - city.operatorCounts.Zong)}</td></tr>)}</tbody></table></div></ContentSection>
    <EvidenceNote>Jazz&apos;s official KML contained 538 Point placemarks when reviewed. Zong&apos;s page source contained 301 LOCS records while its visible banner stated 304 sites. This comparison uses the auditable machine-readable record counts.</EvidenceNote>
    <ContentSection title="What this comparison can tell you" tone="band"><p>It shows how many retained Jazz and Zong records are assigned to each listed city in one versioned release. It can help identify where to inspect markers, but a larger count does not automatically mean broader population coverage or better local service.</p></ContentSection>
    <ContentSection title="What it cannot tell you"><p>The datasets do not model antenna sectors, signal strength, spectrum, indoor penetration, congestion, maintenance or median speed. They also come from different provider publication systems, so record-count differences should be interpreted as source differences as well as rollout differences.</p></ContentSection>
    <ContentSection title="Review each source"><RelatedLinks links={[{ href: `/operators/${jazz.slug}`, title: "Jazz evidence", text: "Official KML provenance and city distribution." }, { href: `/operators/${zong.slug}`, title: "Zong evidence", text: "LOCS array provenance and the banner discrepancy." }, { href: "/reports/pakistan-5g-rollout-august-2026", title: "August rollout baseline", text: "Review all three provider datasets together." }]} /></ContentSection>
  </CoveragePageFrame>;
}
