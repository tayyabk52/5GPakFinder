import Link from "next/link";
import { ArrowRight, Eye, Map, ShieldCheck } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import { SITE_DATASET } from "@/data/siteDataset";
import { absoluteUrl, createPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "About 5GPak",
  description: "Learn why 5GPak exists, what its independent Pakistan mobile-network platform publishes, and how it separates source data from community observations.",
  path: "/about",
});

export default function AboutPage() {
  const aboutJsonLd = { "@context": "https://schema.org", "@type": "AboutPage", name: "About 5GPak", url: absoluteUrl("/about"), mainEntity: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/"), logo: absoluteUrl("/icon.png"), email: "privacy@5gpakistan.app", description: "An independent platform for exploring Pakistan mobile-network site data, community availability signals, and reviewed speed-test insights." } };
  return <main className="h-full overflow-y-auto bg-[#f4f5f6]"><JsonLd data={aboutJsonLd} /><article className="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "About", href: "/about" }]} />
    <header className="mt-5 border-y border-slate-200 bg-white px-5 py-8 sm:px-8 sm:py-10"><p className="text-xs font-bold uppercase text-[#157b98]">Independent Pakistan network platform</p><h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">About 5GPak</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">5GPak helps people inspect where operators have published 5G sites, see privacy-preserving community availability signals, and review independently sourced speed-test evidence without presenting any one source as the whole network picture.</p></header>
    <section className="grid gap-6 py-9 md:grid-cols-3"><Value icon={Map} title="Useful evidence" text={`${SITE_DATASET.totalSites} provider-published site records are organised into one filterable map with source details retained.`} /><Value icon={Eye} title="Visible provenance" text="Source, extraction, review, location precision, and limitations stay visible instead of being hidden behind a single score." /><Value icon={ShieldCheck} title="Privacy boundaries" text="Community contributions are presented as aggregated area signals; precise contributor identifiers are not displayed publicly." /></section>
    <section className="border-y border-slate-200 bg-white px-5 py-8 sm:px-8"><h2 className="text-2xl font-bold text-slate-950">Independence and responsibility</h2><div className="mt-4 space-y-4 text-sm leading-7 text-slate-600"><p>5GPak is not affiliated with Jazz, Zong, Ufone, Onic, Reddit, Ookla, OpenStreetMap, or any telecom regulator unless a page explicitly states otherwise. Third-party names identify sources or networks and remain the property of their respective owners.</p><p>Maps and measurements are informational. Mobile service varies with device support, spectrum, plan eligibility, congestion, terrain, buildings, and network changes. Verify consequential decisions with the operator.</p><p>Questions, corrections, privacy requests, and source-removal concerns can be sent to <a href="mailto:privacy@5gpakistan.app" className="font-semibold underline">privacy@5gpakistan.app</a>.</p></div></section>
    <section className="py-9"><h2 className="text-2xl font-bold text-slate-950">Start with the source that answers your question</h2><div className="mt-5 grid gap-3 sm:grid-cols-3"><AboutLink href="/5g-coverage-map-pakistan" title="Published 5G sites" /><AboutLink href="/network-status" title="Community status" /><AboutLink href="/methodology" title="How the data is handled" /></div></section>
  </article></main>;
}

function Value({ icon: Icon, title, text }: { icon: typeof Map; title: string; text: string }) { return <article><Icon size={22} className="text-[#157b98]" /><h2 className="mt-3 font-bold text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>; }
function AboutLink({ href, title }: { href: string; title: string }) { return <Link href={href} className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 font-bold text-slate-900 hover:border-slate-400">{title}<ArrowRight size={16} /></Link>; }
