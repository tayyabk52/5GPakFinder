import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, MapPinned, RadioTower, Search, ShieldCheck, Smartphone } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import { SITE_DATASET } from "@/data/siteDataset";
import { DATASET_LICENSE_NAME, DATASET_LICENSE_PATH, datasetLicenseJsonLd } from "@/lib/datasetLicense";
import { absoluteUrl, createPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Pakistan 5G Coverage Map: Jazz, Zong & Ufone",
  description: "Check a dated snapshot of 932 provider-published Pakistan 5G site records. Search the interactive Jazz, Zong and Ufone / Onic map and verify every source.",
  path: "/5g-coverage-map-pakistan",
});

const datasetDescription = "A compiled GeoJSON dataset of provider-published Pakistan 5G site locations: 538 Jazz records, 301 Zong records, and 93 Ufone / Onic records. The records describe reported site locations, not measured signal coverage.";

const coverageChecks = [
  { title: "Search your area", text: "Enter a city, neighbourhood, road, or landmark. The map can move to a matching Pakistan location even when a site record has no city label." },
  { title: "Choose an operator", text: "Use the Networks control to compare Jazz, Zong, and Ufone / Onic without mixing their provider-published records." },
  { title: "Inspect the marker", text: "Select a site to see its operator, record identifier, source, and location-accuracy note." },
  { title: "Confirm on your phone", text: "Treat the map as a starting point. Check the exact handset model, enable 5G, and test outdoors and indoors where you use the service." },
] as const;

const commonQuestions = [
  { question: "Is 5G available everywhere in Pakistan?", answer: "No. The map shows discrete provider-published site records in a dated release, not continuous nationwide coverage. An area between markers should not be assumed to have 5G." },
  { question: "Which Pakistan networks are included?", answer: "This release includes Jazz, Zong, and Ufone / Onic source records. The record totals are not a ranking of network quality, subscribers, geographic coverage, or current live-site totals." },
  { question: "Does the nearest 5G site guarantee a signal?", answer: "No. A site point does not model antenna direction, spectrum, terrain, buildings, congestion, maintenance, account eligibility, or handset support." },
  { question: "How current is this coverage data?", answer: `The downloadable map dataset is a snapshot retrieved ${formatDate(SITE_DATASET.retrievedAt)}. This page and its source links were reviewed ${formatDate(SITE_DATASET.reviewedAt)}. Operators can publish changes between 5GPak releases.` },
] as const;

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
    version: SITE_DATASET.retrievedAt,
    mainEntityOfPage: absoluteUrl("/5g-coverage-map-pakistan"),
    keywords: ["Pakistan 5G coverage", "Jazz 5G sites", "Zong 5G sites", "Ufone 5G sites", "GeoJSON"],
    isAccessibleForFree: true,
    license: datasetLicenseJsonLd(),
    spatialCoverage: { "@type": "Place", name: "Pakistan" },
    isBasedOn: SITE_DATASET.providers.map((provider) => provider.sourceUrl),
    measurementTechnique: "Compilation of provider-published coordinates and geocoding of provider-published location records",
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
        <h1 className="mt-3 max-w-4xl text-3xl font-bold text-slate-950 sm:text-4xl lg:text-5xl">Pakistan 5G coverage map for Jazz, Zong and Ufone</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">Search a versioned snapshot of {SITE_DATASET.totalSites.toLocaleString("en-PK")} provider-published 5G site records across Pakistan. Every record keeps its operator source and accuracy note, while community status and Reddit speed samples remain separate map layers.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/map" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800">Open interactive map <ArrowRight size={17} /></Link><Link href="/methodology" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 hover:border-slate-500">Read the methodology</Link></div>
      </header>

      <section aria-labelledby="quick-answer" className="border-b border-slate-200 bg-[#eaf6f8] px-5 py-6 sm:px-8">
        <div className="flex items-start gap-3"><CheckCircle2 size={22} className="mt-0.5 shrink-0 text-[#126c85]" /><div><h2 id="quick-answer" className="text-lg font-bold text-slate-950">Quick answer</h2><p className="mt-1 max-w-4xl text-sm leading-6 text-slate-700">Pakistan has active 5G rollouts, but availability is local rather than blanket nationwide coverage. This map release contains {SITE_DATASET.totalSites.toLocaleString("en-PK")} records retrieved {formatDate(SITE_DATASET.retrievedAt)}. Search your exact area and verify the marker against its linked operator source before making a network or device decision.</p></div></div>
      </section>

      <nav aria-label="On this page" className="flex gap-x-5 gap-y-2 overflow-x-auto border-b border-slate-200 py-4 text-sm font-semibold text-slate-700">
        <a href="#check-coverage" className="shrink-0 hover:text-[#126c85]">Check your area</a><a href="#dataset-summary" className="shrink-0 hover:text-[#126c85]">Dataset</a><a href="#operator-sources" className="shrink-0 hover:text-[#126c85]">Operator sources</a><a href="#coverage-requirements" className="shrink-0 hover:text-[#126c85]">Getting 5G</a><a href="#coverage-questions" className="shrink-0 hover:text-[#126c85]">Questions</a>
      </nav>

      <section id="check-coverage" aria-labelledby="check-coverage-title" className="py-8">
        <div className="flex items-center gap-3"><Search size={20} className="text-slate-500" /><h2 id="check-coverage-title" className="text-2xl font-bold text-slate-950">How to check 5G coverage near you</h2></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">The useful question is not whether an entire city has 5G. Check the neighbourhood, street, workplace, or landmark where you expect to use it.</p>
        <ol className="mt-5 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2">
          {coverageChecks.map((item, index) => <li key={item.title} className="bg-white p-5"><span className="font-mono text-sm font-bold text-[#126c85]">0{index + 1}</span><h3 className="mt-2 font-bold text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></li>)}
        </ol>
        <Link href="/map" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800">Search the Pakistan 5G map <ArrowRight size={17} /></Link>
      </section>

      <section aria-labelledby="dataset-summary" className="py-8">
        <div className="flex items-center gap-3"><Database size={20} className="text-slate-500" /><h2 id="dataset-summary" className="text-2xl font-bold text-slate-950">Dataset at a glance</h2></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={SITE_DATASET.totalSites.toLocaleString("en-PK")} label="Total site records" />
          {SITE_DATASET.providers.map((provider) => <Stat key={provider.name} value={provider.count.toLocaleString("en-PK")} label={provider.name} />)}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">Source material retrieved {formatDate(SITE_DATASET.retrievedAt)}. Counts describe records in this release, not nationwide population coverage or each operator&apos;s current live-site total. Provider pages can change before the next map release.</p>
        <p className="mt-3 text-sm text-slate-600">Dataset use: <Link href={DATASET_LICENSE_PATH} className="font-semibold text-[#126c85] underline underline-offset-2">{DATASET_LICENSE_NAME}</Link>.</p>
        <a href="/data/sites.geojson" download className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-slate-500">Download the GeoJSON snapshot <Database size={16} /></a>
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

      <section id="coverage-requirements" aria-labelledby="coverage-requirements-title" className="border-y border-slate-200 bg-white px-5 py-8 sm:px-8">
        <div className="flex items-center gap-3"><Smartphone size={20} className="text-slate-500" /><h2 id="coverage-requirements-title" className="text-2xl font-bold text-slate-950">Why a phone may not connect to 5G near a mapped site</h2></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Site proximity is only one requirement. Check these points before concluding that a map record is wrong.</p>
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          <Explanation icon={Smartphone} title="Exact handset model" text="A phone name alone is not enough. Regional variants can support different bands or carrier configurations, so use the operator's compatibility list for the exact model." />
          <Explanation icon={RadioTower} title="Settings and conditions" text="Enable 5G or 5G Auto. Buildings, terrain, distance, antenna direction, maintenance, and network load can change the signal at a specific moment." />
          <Explanation icon={ShieldCheck} title="Operator confirmation" text="Confirm plan, SIM, software, and activation requirements with your operator. 5GPak does not provision service and cannot confirm account eligibility." />
        </div>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold"><a href="https://jazz.com.pk/5g-handsets" target="_blank" rel="noreferrer" className="text-[#126c85] underline underline-offset-2">Jazz compatible handsets</a><a href="https://www.zong.com.pk/vas/compatible-5g-handsets" target="_blank" rel="noreferrer" className="text-[#126c85] underline underline-offset-2">Zong compatible handsets</a><a href="https://www.zong.com.pk/vas/how-to-enable-5g-on-your-device" target="_blank" rel="noreferrer" className="text-[#126c85] underline underline-offset-2">Zong setup guide</a></div>
      </section>

      <section id="coverage-questions" aria-labelledby="coverage-questions-title" className="py-8">
        <h2 id="coverage-questions-title" className="text-2xl font-bold text-slate-950">Pakistan 5G coverage questions</h2>
        <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {commonQuestions.map((item) => <article key={item.question} className="px-5 py-5 sm:px-8"><h3 className="font-bold text-slate-950">{item.question}</h3><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{item.answer}</p></article>)}
        </div>
      </section>

      <section aria-labelledby="use-data" className="border-t border-slate-200 pt-8">
        <h2 id="use-data" className="text-2xl font-bold text-slate-950">Explore the evidence behind the map</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><TextLink href="/map" title="Interactive coverage map" text="Filter operator site records and optional community layers." /><TextLink href="/coverage" title="Coverage by city" text="Compare source records across major Pakistan cities." /><TextLink href="/reports/pakistan-5g-rollout-august-2026" title="August 2026 report" text="Read the dated baseline and provider source audit." /><TextLink href="/methodology" title="Collection methodology" text="Understand source handling, aggregation, precision, and limitations." /></div>
        <p className="mt-6 text-xs leading-5 text-slate-500">Page reviewed {formatDate(SITE_DATASET.reviewedAt)}. Dataset snapshot retrieved {formatDate(SITE_DATASET.retrievedAt)}.</p>
      </section>
    </div>
  </main>;
}

function Stat({ value, label }: { value: string; label: string }) { return <article className="rounded-lg border border-slate-200 bg-white p-5"><p className="font-mono text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm font-semibold text-slate-600">{label}</p></article>; }
function Explanation({ icon: Icon, title, text }: { icon: typeof MapPinned; title: string; text: string }) { return <article><Icon size={21} className="text-[#157b98]" /><h3 className="mt-3 font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>; }
function TextLink({ href, title, text }: { href: string; title: string; text: string }) { return <Link href={href} className="group rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-400"><span className="flex items-center justify-between gap-3 font-bold text-slate-950">{title}<ArrowRight size={16} className="transition group-hover:translate-x-1" /></span><span className="mt-2 block text-sm leading-6 text-slate-600">{text}</span></Link>; }
function formatDate(date: string) { return new Intl.DateTimeFormat("en-PK", { dateStyle: "long", timeZone: "Asia/Karachi" }).format(new Date(`${date}T00:00:00+05:00`)); }
