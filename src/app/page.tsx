import Link from "next/link";
import { ArrowRight, BookOpenCheck, Database, MapPinned, RadioTower, SatelliteDish, Send, ShieldCheck } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import { SITE_DATASET } from "@/data/siteDataset";
import { getCoverageCities } from "@/server/coverage/catalog";
import { absoluteUrl, createPageMetadata, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "5GPak: Pakistan 5G Coverage Map & Network Status",
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

const actions = [
  { href: "/map", title: "Map", text: "Coverage & sites", icon: MapPinned, tone: "bg-[#bdebf6]", iconTone: "from-[#49cbeb] to-[#209bc2]" },
  { href: "/network-status", title: "Status", text: "Live signals", icon: RadioTower, tone: "bg-[#baf3d9]", iconTone: "from-[#71e3b1] to-[#25af7a]" },
  { href: "/network-history", title: "History", text: "Recent trends", icon: SatelliteDish, tone: "bg-[#ffe39a]", iconTone: "from-[#ffd970] to-[#e6aa26]" },
  { href: "/network-status", title: "Report", text: "Share availability", icon: Send, tone: "bg-[#e7ddff]", iconTone: "from-[#bba1f6] to-[#7d63cf]" },
];

export default function HomePage() {
  const coverageCities = getCoverageCities().slice(0, 6);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      alternateName: "5GPak Pakistan Network Companion",
      url: absoluteUrl("/"),
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icon.png"),
      email: "privacy@5gpakistan.app",
      description: "An independent platform for Pakistan 5G site data, community network availability signals, and reviewed speed-test insights.",
    },
  ];

  return <main className="h-full overflow-y-auto bg-[#f4f5f6] px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
    <JsonLd data={structuredData} />
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#1d1d1d] px-6 py-7 text-white shadow-lg sm:px-8 sm:py-9 lg:px-10">
        <div className="relative z-10 max-w-3xl"><p className="text-xs font-bold tracking-[0.14em] text-[#8de2f5]">PAKISTAN NETWORK COMPANION</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl lg:text-5xl">Pakistan 5G coverage and network status</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Explore {SITE_DATASET.totalSites} provider-published 5G site records, privacy-preserving community availability signals, and independently reviewed mobile speed-test evidence.</p><Link href="/map" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-[#bdebf6]">Open map <ArrowRight size={17}/></Link></div>
        <div aria-hidden className="absolute inset-y-0 right-0 w-2 bg-[#49cbeb]" />
      </section>
      <section className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{actions.map(({href,title,text,icon:Icon,tone,iconTone}) => <Link key={title} href={href} className={`${tone} group relative min-h-40 overflow-hidden rounded-[1.5rem] p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:min-h-44 sm:p-5`}><div className={`grid h-11 w-11 place-items-center rounded-[0.9rem] bg-gradient-to-br ${iconTone} text-white shadow-[0_6px_14px_rgba(15,23,42,.16)] ring-1 ring-white/60`}><Icon size={22} strokeWidth={2.25}/></div><h2 className="mt-8 text-xl font-bold tracking-tight sm:mt-9 sm:text-2xl">{title}</h2><p className="mt-1 text-xs font-medium text-slate-700 sm:text-sm">{text}</p><span aria-hidden className="absolute bottom-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-white/60 text-slate-800 transition group-hover:translate-x-1 group-hover:bg-white"><ArrowRight size={16}/></span></Link>)}</section>
      <section className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-[1.2fr_.8fr]"><article className="rounded-[1.5rem] bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#bdebf6]"><ShieldCheck size={20}/></div><div><h2 className="font-semibold">Built around your privacy</h2><p className="text-sm text-slate-600">No account required.</p></div></div><p className="mt-4 text-sm leading-6 text-slate-600">Reports are anonymous. We show aggregated area signals, not individual locations, fingerprints, or IP data.</p></article><article className="rounded-[1.5rem] bg-[#baf3d9] p-5"><p className="text-xs font-bold tracking-[0.12em] text-slate-700">START WITH YOUR AREA</p><h2 className="mt-2 text-xl font-bold tracking-tight">Help make the signal useful.</h2><Link href="/network-status#report" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[#1d1d1d] px-4 text-sm font-semibold text-white">Report availability</Link></article></section>
      <section className="mt-4 border-y border-slate-200 bg-white px-5 py-7 sm:px-7"><div className="max-w-3xl"><p className="text-xs font-bold uppercase text-[#157b98]">Understand the evidence</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Three source types, clearly separated</h2><p className="mt-3 text-sm leading-6 text-slate-600">Operator-published site locations show where a source reports infrastructure. Community status signals summarize recent voluntary reports. The Reddit sample preserves independently reviewed speed-test evidence. None is presented as guaranteed coverage.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><EvidenceLink href="/5g-coverage-map-pakistan" icon={Database} title="Coverage data" text="Counts, provider sources, and accuracy notes."/><EvidenceLink href="/methodology" icon={BookOpenCheck} title="Methodology" text="Collection, review, aggregation, and limitations."/><EvidenceLink href="/about" icon={ShieldCheck} title="About 5GPak" text="Independence, purpose, and correction channel."/></div></section>
      <section className="mt-4 border-y border-slate-200 bg-white px-5 py-7 sm:px-7"><p className="text-xs font-bold uppercase text-[#157b98]">Explore local evidence</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold text-slate-950">5G coverage by city</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Compare dated provider record counts, then open the map for the exact area where you need service.</p></div><Link href="/coverage" className="text-sm font-bold text-[#126c85] underline underline-offset-2">View all city coverage</Link></div><div className="mt-5 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">{coverageCities.map((city) => <Link key={city.slug} href={`/coverage/${city.slug}`} className="group bg-white p-4 hover:bg-slate-50"><span className="flex items-center justify-between font-bold text-slate-950">{city.name}<ArrowRight size={15} className="transition group-hover:translate-x-1"/></span><span className="mt-1 block text-xs text-slate-600">{city.totalSites} provider-published site records</span></Link>)}</div></section>
    </div>
  </main>;
}

function EvidenceLink({ href, icon: Icon, title, text }: { href: string; icon: typeof Database; title: string; text: string }) { return <Link href={href} className="group rounded-lg border border-slate-200 p-4 hover:border-slate-400"><Icon size={19} className="text-[#157b98]"/><span className="mt-3 flex items-center justify-between gap-3 font-bold text-slate-950">{title}<ArrowRight size={15} className="transition group-hover:translate-x-1"/></span><span className="mt-1 block text-xs leading-5 text-slate-600">{text}</span></Link>; }
