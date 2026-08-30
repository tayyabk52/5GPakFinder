import Link from "next/link";
import { ArrowRight, CheckCircle2, FileSearch, MapPinned, UsersRound } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SITE_DATASET } from "@/data/siteDataset";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Data Sources and Methodology",
  description: "How 5GPak collects, labels, reviews, maps, aggregates, and limits Pakistan 5G site data, community network reports, and Reddit speed-test samples.",
  path: "/methodology",
});

export default function MethodologyPage() {
  return <main className="h-full overflow-y-auto bg-[#f4f5f6]">
    <article className="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Methodology", href: "/methodology" }]} />
      <header className="mt-5 border-y border-slate-200 bg-white px-5 py-8 sm:px-8 sm:py-10"><p className="text-xs font-bold uppercase text-[#157b98]">Transparency and limitations</p><h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">How 5GPak collects and presents network data</h1><p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">5GPak keeps operator-published locations, anonymous community availability signals, and public Reddit-derived measurements as separate sources. They answer different questions and are never silently merged into one claim.</p><p className="mt-4 text-sm font-semibold text-slate-500">Methodology reviewed: 30 August 2026</p></header>

      <div className="divide-y divide-slate-200">
        <MethodSection icon={MapPinned} number="01" title="Provider-published 5G site locations">
          <p>The site layer contains {SITE_DATASET.totalSites} records from operator-published material retrieved on 7 August 2026: {SITE_DATASET.providers.map((provider) => `${provider.count} ${provider.name}`).join(", ")}.</p>
          <ul><li>Jazz and Zong records retain coordinate values exposed by their published map material.</li><li>Ufone / Onic records were geocoded from provider data and are explicitly labelled as approximate.</li><li>Every feature retains the provider source URL, retrieval date, record identifier, and an accuracy note.</li><li>A site point is not a coverage polygon and does not prove service at a home, street, or device.</li></ul>
          <Link href="/5g-coverage-map-pakistan" className="mt-4 inline-flex items-center gap-2 font-bold text-[#126c85]">View sources and counts <ArrowRight size={16} /></Link>
        </MethodSection>

        <MethodSection icon={UsersRound} number="02" title="Community network availability reports">
          <p>People can voluntarily submit an operator, an availability state, an issue type, and a location. Reports are rate-limited and grouped into area-level signals.</p>
          <ul><li>Public views show aggregated cells or incident summaries, not a contributor&apos;s precise coordinate, fingerprint, or IP-derived identifier.</li><li>Signals require community agreement and expire or move toward recovery when fresh evidence no longer supports an incident.</li><li>These are community observations, not operator-confirmed outage notices or technical service guarantees.</li></ul>
        </MethodSection>

        <MethodSection icon={FileSearch} number="03" title="Independent Reddit speed-test sample">
          <p>The Reddit dataset is a curated snapshot of public r/PakistaniTech source posts supplied in CSV form. It is independent of both operator records and reports submitted directly to 5GPak.</p>
          <ul><li>Measurements may come from an accessible Speedtest result or careful transcription of values visible in a screenshot.</li><li>Only a single attributable cellular result is approved for aggregate statistics; comparisons, fixed-line tests, missing evidence, and ambiguous records remain excluded or in review.</li><li>Map placement uses stated coordinates or a labelled landmark, area, multi-area, or city centroid. It is never represented as the poster&apos;s device GPS unless the source explicitly provides that evidence.</li><li>Every record keeps its source post, extraction confidence, review status, placement method, and reviewer note visible.</li></ul>
          <Link href="/insights/reddit-speedtests" className="mt-4 inline-flex items-center gap-2 font-bold text-[#b83200]">Review the complete ledger <ArrowRight size={16} /></Link>
        </MethodSection>

        <MethodSection icon={CheckCircle2} number="04" title="Corrections, freshness, and responsible use">
          <p>Network deployments and published source material change. The retrieval date describes this dataset release; it does not mean every operator source was updated that day.</p>
          <ul><li>Verify important coverage, plan, handset, and outage decisions directly with the relevant operator.</li><li>Do not use 5GPak as an emergency communications source.</li><li>Report a source correction or removal concern to <a href="mailto:privacy@5gpakistan.app" className="font-semibold underline">privacy@5gpakistan.app</a> with the affected URL or record identifier.</li><li>Material methodology changes should update this page and the sitemap modification date.</li></ul>
        </MethodSection>
      </div>
    </article>
  </main>;
}

function MethodSection({ icon: Icon, number, title, children }: { icon: typeof MapPinned; number: string; title: string; children: React.ReactNode }) { return <section className="grid gap-5 py-8 sm:grid-cols-[5rem_minmax(0,1fr)] sm:py-10"><div><span className="font-mono text-sm font-bold text-slate-400">{number}</span><Icon size={23} className="mt-3 text-[#157b98]" /></div><div><h2 className="text-2xl font-bold text-slate-950">{title}</h2><div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div></div></section>; }
