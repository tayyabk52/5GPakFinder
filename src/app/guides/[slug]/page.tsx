import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { ContentSection, CoverageHeader, CoveragePageFrame, EvidenceNote, RelatedLinks, SourceLink } from "@/features/seo-coverage/CoveragePage";
import { COVERAGE_GUIDES, getCoverageGuide } from "@/features/seo-coverage/content";
import { getCoverageReviewFacts } from "@/server/coverage/catalog";
import { absoluteUrl, createPageMetadata, SITE_NAME } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return COVERAGE_GUIDES.map((guide) => ({ slug: guide.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getCoverageGuide(slug);
  if (!guide) return {};
  return createPageMetadata({ title: guide.title, description: guide.description, path: `/guides/${guide.slug}` });
}

export default async function CoverageGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getCoverageGuide(slug);
  if (!guide) notFound();
  const facts = getCoverageReviewFacts();
  return <CoveragePageFrame>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description, url: absoluteUrl(`/guides/${guide.slug}`), dateModified: facts.reviewedAt, author: { "@type": "Organization", name: SITE_NAME }, publisher: { "@type": "Organization", name: SITE_NAME }, mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`) }} />
    <CoverageHeader eyebrow={guide.eyebrow} title={guide.title} description={guide.intro} breadcrumbs={[{ name: "Home", href: "/" }, { name: "Coverage", href: "/coverage" }, { name: guide.title, href: `/guides/${guide.slug}` }]} primaryHref="/map" primaryLabel="Check an exact location" />
    {guide.sections.map((section, index) => <ContentSection key={section.title} title={section.title} tone={index % 2 ? "band" : "plain"}><>{section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 first:mt-0">{paragraph}</p>)}{section.checks && <ul className="mt-4 grid gap-2 sm:grid-cols-2">{section.checks.map((check) => <li key={check} className="border-l-2 border-[#157b98] bg-white px-4 py-3 text-slate-700">{check}</li>)}</ul>}</></ContentSection>)}
    <EvidenceNote>5GPak&apos;s map is an independent presentation of dated provider records. It cannot confirm a phone&apos;s account eligibility, current site operation, signal or speed.</EvidenceNote>
    <ContentSection title="Common questions"><div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">{guide.questions.map((item) => <article key={item.question} className="px-5 py-5"><h3 className="font-bold text-slate-950">{item.question}</h3><p className="mt-2">{item.answer}</p></article>)}</div></ContentSection>
    <ContentSection title="Official references" tone="band"><ul className="space-y-3">{guide.sources.map((source) => <li key={source.href}><SourceLink href={source.href}>{source.label}</SourceLink></li>)}</ul></ContentSection>
    <ContentSection title="Continue researching"><RelatedLinks links={[{ href: "/coverage", title: "Coverage by city", text: "Compare operator record counts in major cities." }, { href: "/5g-coverage-map-pakistan", title: "Dataset and methodology", text: "Review the national snapshot and its limitations." }, { href: "/reports/pakistan-5g-rollout-august-2026", title: "August 2026 report", text: "Read the dated rollout baseline and source audit." }]} /></ContentSection>
  </CoveragePageFrame>;
}
