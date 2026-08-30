import Link from "next/link";
import { ArrowRight, Database, MapPinned, RadioTower, ShieldCheck } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import { SITE_DATASET } from "@/data/siteDataset";
import { absoluteUrl, createPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Pakistan 5G Coverage Map and Site Data",
  description: "Explore 932 provider-published 5G site locations for Jazz, Zong, and Ufone / Onic in Pakistan, with source links, limitations, and an interactive map.",
  path: "/5g-coverage-map-pakistan",
});

const datasetDescription = "A compiled GeoJSON dataset of provider-published Pakistan 5G site locations: 538 Jazz records, 301 Zong records, and 93 Ufone / Onic records. The records describe reported site locations, not measured signal coverage.";

export default function Pakistan5GCoveragePage() {
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: SITE_DATASET.name,
    description: datasetDescription,
    url: absoluteUrl("/5g-coverage-map-pakistan"),
    identifier: absoluteUrl("/5g-coverage-map-pakistan"),
    creator: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    dateModified: SITE_DATASET.retrievedAt,
    spatialCoverage: { "@type": "Place", name: "Pakistan" },
    isBasedOn: SITE_DATASET.providers.map((provider) => provider.sourceUrl),
    variableMeasured: ["Mobile network operator", "Site latitude", "Site longitude", "Source record identifier"],
    distribution: {
      "@type": "DataDownload",
      contentUrl: absoluteUrl("/data/sites.geojson"),
      encodingFormat: "application/geo+json",
    },
  };

  return <main className="h-full overflow-y-auto bg-[#f4f5f6]">
    <JsonLd data={datasetJsonLd} />
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Pakistan 5G coverage", href: "/5g-coverage-map-pakistan" }]} />
      <header className="mt-5 border-y border-slate-200 bg-white px-5 py-8 sm:px-8 sm:py-10">
        <p className="text-xs font-bold uppercase text-[#157b98]">Provider-published site data</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-bold text-slate-950 sm:text-4xl lg:text-5xl">Pakistan 5G coverage map and operator site locations</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">Explore {SITE_DATASET.totalSites.toLocaleString("en-PK")} 5G site records published by Jazz, Zong, and Ufone / Onic. The interactive map combines these records with separately labelled community status and independent speed-test layers.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/map" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800">Open interactive map <ArrowRight size={17} /></Link><Link href="/methodology" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 hover:border-slate-500">Read the methodology</Link></div>
      </header>

      <section aria-labelledby="dataset-summary" className="py-8">
        <div className="flex items-center gap-3"><Database size={20} className="text-slate-500" /><h2 id="dataset-summary" className="text-2xl font-bold text-slate-950">Dataset at a glance</h2></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={SITE_DATASET.totalSites.toLocaleString("en-PK")} label="Total site records" />
          {SITE_DATASET.providers.map((provider) => <Stat key={provider.name} value={provider.count.toLocaleString("en-PK")} label={provider.name} />)}
        </div>
        <p className="mt-4 text-sm text-slate-500">Source material retrieved {formatDate(SITE_DATASET.retrievedAt)}. Counts describe records in this release, not nationwide population coverage.</p>
      </section>

      <section aria-labelledby="what-map-means" className="border-y border-slate-200 bg-white px-5 py-8 sm:px-8">
        <h2 id="what-map-means" className="text-2xl font-bold text-slate-950">What the map does and does not show</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          <Explanation icon={MapPinned} title="Site locations" text="Pins represent coordinates or geocoded locations derived from operator-published material. They are not device locations." />
          <Explanation icon={RadioTower} title="Not a signal guarantee" text="A nearby site does not guarantee indoor coverage, 5G access, speed, capacity, or service on a particular plan or handset." />
          <Explanation icon={ShieldCheck} title="Independent presentation" text="5GPak is independent of the operators. Provider records are kept distinct from community reports and Reddit-derived measurements." />
        </div>
      </section>

      <section aria-labelledby="operator-sources" className="py-8">
        <h2 id="operator-sources" className="text-2xl font-bold text-slate-950">Operator sources and location accuracy</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Each map record retains its operator, source dataset, source URL, retrieval date, and accuracy note. This makes the layer auditable and prevents an approximate geocode from being presented as a surveyed tower coordinate.</p>
        <div className="mt-5 overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <caption className="sr-only">Sources for Pakistan 5G operator site records</caption>
            <thead className="bg-slate-950 text-white"><tr><th className="px-4 py-3">Operator</th><th className="px-4 py-3">Records</th><th className="px-4 py-3">Published source</th><th className="px-4 py-3">Accuracy note</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{SITE_DATASET.providers.map((provider) => <tr key={provider.name} className="align-top"><th scope="row" className="px-4 py-4 font-bold text-slate-950">{provider.name}</th><td className="px-4 py-4 font-mono text-slate-700">{provider.count}</td><td className="px-4 py-4"><a href={provider.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#126c85] underline underline-offset-2">{provider.sourceName}</a></td><td className="px-4 py-4 leading-6 text-slate-600">{provider.accuracy}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="use-data" className="border-t border-slate-200 pt-8">
        <h2 id="use-data" className="text-2xl font-bold text-slate-950">Explore the evidence behind the map</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><TextLink href="/map" title="Interactive coverage map" text="Filter operator site records and optional community layers." /><TextLink href="/insights/reddit-speedtests" title="Reddit speed-test sample" text="Review extracted measurements, exclusions, and source provenance." /><TextLink href="/methodology" title="Collection methodology" text="Understand source handling, aggregation, precision, and limitations." /></div>
      </section>
    </div>
  </main>;
}

function Stat({ value, label }: { value: string; label: string }) { return <article className="rounded-lg border border-slate-200 bg-white p-5"><p className="font-mono text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm font-semibold text-slate-600">{label}</p></article>; }
function Explanation({ icon: Icon, title, text }: { icon: typeof MapPinned; title: string; text: string }) { return <article><Icon size={21} className="text-[#157b98]" /><h3 className="mt-3 font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>; }
function TextLink({ href, title, text }: { href: string; title: string; text: string }) { return <Link href={href} className="group rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-400"><span className="flex items-center justify-between gap-3 font-bold text-slate-950">{title}<ArrowRight size={16} className="transition group-hover:translate-x-1" /></span><span className="mt-2 block text-sm leading-6 text-slate-600">{text}</span></Link>; }
function formatDate(date: string) { return new Intl.DateTimeFormat("en-PK", { dateStyle: "long", timeZone: "Asia/Karachi" }).format(new Date(`${date}T00:00:00+05:00`)); }
