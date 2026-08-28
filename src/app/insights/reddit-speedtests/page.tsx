import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSearch, MapPinned, ScanSearch } from "lucide-react";
import ObservationsTable from "@/features/reddit-speedtests/components/ObservationsTable";
import { getRedditObservations } from "@/server/reddit-speedtests/repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reddit Speed-Test Sample | 5GPak", robots: { index: false, follow: true } };

export default async function RedditSpeedTestsPage() {
  const rows = await getRedditObservations();
  const counts = Object.fromEntries(["approved", "needs_review", "unresolved", "excluded"].map((status) => [status, rows.filter((row) => row.reviewStatus === status).length]));
  return <main className="h-full overflow-y-auto bg-[#f4f5f6] px-4 py-6 sm:px-6 lg:px-10"><div className="mx-auto max-w-7xl pb-10"><Link href="/insights?source=reddit" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700"><ArrowLeft size={17}/> Back to insights</Link>
    <header className="mt-3 border-t-4 border-[#FF4500] bg-white p-5 sm:p-8"><p className="text-xs font-bold uppercase text-[#b83200]">Independent Reddit sample</p><h1 className="mt-2 max-w-3xl text-3xl font-bold text-slate-950 sm:text-4xl">Pakistani mobile speed tests, with the evidence kept visible.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">A curated snapshot of 83 r/PakistaniTech posts. Approved cellular measurements power the statistics and map; every excluded or unresolved source remains in the ledger below.</p><div className="mt-6 grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4"><Count label="Approved" value={counts.approved ?? 0}/><Count label="Needs review" value={counts.needs_review ?? 0}/><Count label="Unresolved" value={counts.unresolved ?? 0}/><Count label="Excluded" value={counts.excluded ?? 0}/></div></header>
    <section className="mt-5 grid gap-px bg-slate-200 md:grid-cols-4"><Step icon={FileSearch} title="Collection" text="Imported from the supplied CSV. The original collection transport was not recorded."/><Step icon={ScanSearch} title="Extraction" text="Screenshot and Ookla values were transcribed through OCR and retained with confidence labels."/><Step icon={CheckCircle2} title="Review" text="Only a single attributable cellular result is approved. Comparisons and anomalies stay out."/><Step icon={MapPinned} title="Placement" text="Pins use stated coordinates or labelled landmark, area, and city centroids, never implied device GPS."/></section>
    <ObservationsTable rows={rows}/>
  </div></main>;
}
function Count({ label, value }: { label: string; value: number }) { return <div className="bg-slate-50 p-4"><p className="font-mono text-2xl font-bold text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>; }
function Step({ icon: Icon, title, text }: { icon: typeof FileSearch; title: string; text: string }) { return <div className="bg-white p-5"><Icon size={20} className="text-[#d63c00]"/><h2 className="mt-3 font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-600">{text}</p></div>; }
