import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import RedditEmbed from "@/features/reddit-speedtests/components/RedditEmbed";
import { getRedditObservation } from "@/server/reddit-speedtests/repository";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  return createPageMetadata({
    title: "Reddit Speed-Test Evidence Record",
    description: "Review the extraction, source evidence, confidence, and map-placement notes for this Pakistani mobile speed-test sample.",
    path: `/insights/reddit-speedtests/${postId}`,
    index: false,
  });
}
export default async function RecordPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!/^[a-z0-9]+$/.test(postId)) notFound();
  const row = await getRedditObservation(postId);
  if (!row) notFound();
  const value = (number: number | null, unit: string) => number == null ? "Not extracted" : `${number} ${unit}`;
  return <main className="h-full overflow-y-auto bg-[#f4f5f6] px-4 py-6 sm:px-6 lg:px-10"><div className="mx-auto max-w-4xl pb-10"><Link href="/insights/reddit-speedtests" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700"><ArrowLeft size={17}/> Dataset records</Link>
    <article className="mt-3 border-t-4 border-[#FF4500] bg-white p-5 sm:p-8"><div className="flex flex-wrap items-center gap-2"><span className="bg-orange-50 px-2 py-1 text-xs font-bold uppercase text-[#b83200]">{row.reviewStatus.replace("_", " ")}</span><span className="text-xs text-slate-500">Post {row.postId}</span></div><h1 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">{row.title}</h1><p className="mt-2 text-sm text-slate-500">{new Intl.DateTimeFormat("en-PK", { dateStyle: "long" }).format(new Date(row.createdAt))}</p>
      <dl className="mt-7 grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4"><Datum label="Operator" value={row.reportedBrand ?? "Not resolved"}/><Datum label="Technology" value={row.generation?.toUpperCase() ?? row.accessType}/><Datum label="Download" value={value(row.downloadMbps, "Mbps")}/><Datum label="Upload" value={value(row.uploadMbps, "Mbps")}/><Datum label="Ping" value={value(row.pingMs, "ms")}/><Datum label="Jitter" value={value(row.jitterMs, "ms")}/><Datum label="Location" value={[row.area, row.city].filter(Boolean).join(", ") || "Not stated"}/><Datum label="Location confidence" value={`${row.locationConfidence} · ${row.locationMethod.replaceAll("_", " ")}`}/></dl>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><section className="border border-slate-200 p-4"><h2 className="font-bold">Evidence review</h2><p className="mt-2 text-sm leading-6 text-slate-600">{row.metricsSource.replaceAll("_", " ")} · {row.extractionConfidence} confidence.</p><p className="mt-2 text-sm leading-6 text-slate-600">{row.reviewerNote}</p>{row.exclusionReason && <p className="mt-2 text-sm font-medium text-amber-900">{row.exclusionReason}</p>}</section><section className="border border-slate-200 p-4"><h2 className="font-bold">Map placement</h2><p className="mt-2 text-sm leading-6 text-slate-600">{row.locationNote ?? "This record is not mapped."}</p>{row.speedtestUrl && <a href={row.speedtestUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 underline">Open Speedtest result <ExternalLink size={14}/></a>}</section></div>
    </article><div className="mt-5"><RedditEmbed url={row.postUrl}/></div>
  </div></main>;
}
function Datum({ label, value }: { label: string; value: string }) { return <div className="min-w-0 bg-slate-50 p-4"><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</dd></div>; }
