"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Database, Download, MapPin, Radio, Timer } from "lucide-react";
import type { RedditGeneration, RedditSummary } from "../types";

const metric = (value: number | null, unit: string) => value == null ? "-" : `${Math.round(value)} ${unit}`;

export default function RedditInsightsPanel({ generation }: { generation: RedditGeneration }) {
  const [result, setResult] = useState<{ generation: RedditGeneration; summary: RedditSummary | null; error: string }>();
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reddit-speedtests/summary?generation=${generation}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setResult({ generation, summary: body.summary, error: "" }); })
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setResult({ generation, summary: null, error: reason instanceof Error ? reason.message : "Sample unavailable." }); });
    return () => controller.abort();
  }, [generation]);
  const summary = result?.generation === generation ? result.summary : undefined;
  const error = result?.generation === generation ? result.error : "";
  const qualifyingNetworks = useMemo(() => summary?.networks.filter((item) => item.observationCount >= 3) ?? [], [summary]);
  if (error) return <div role="alert" className="mt-4 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{error}</div>;
  if (summary === undefined) return <div className="mt-4 border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading the published Reddit sample...</div>;
  if (summary === null) return <div className="mt-4 border border-slate-200 bg-white p-6 text-sm text-slate-600">No published Reddit sample is available.</div>;
  return <>
    <section className="mt-4 grid grid-cols-2 border border-slate-200 bg-white md:grid-cols-4">
      <Metric icon={Database} label="Approved samples" value={String(summary.observationCount)} />
      <Metric icon={Download} label="Median download" value={metric(summary.medianDownload, "Mbps")} />
      <Metric icon={Timer} label="Median latency" value={metric(summary.medianPing, "ms")} />
      <Metric icon={MapPin} label="Mapped samples" value={`${summary.mappedObservationCount}/${summary.observationCount}`} />
    </section>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <section className="border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-slate-500">Provider samples</p><h2 className="mt-1 text-xl font-bold text-slate-950">Median {generation.toUpperCase()} download</h2></div><span className="bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#b83200]">n ≥ 3</span></div>
        <div className="mt-5 divide-y divide-slate-100">{qualifyingNetworks.map((item) => <div key={item.name} className="grid grid-cols-[1fr_auto] gap-4 py-4"><div><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.observationCount} observations · P90 {metric(item.p90Download, "Mbps")}</p></div><p className="font-mono text-lg font-bold text-slate-950">{metric(item.medianDownload, "Mbps")}</p></div>)}{!qualifyingNetworks.length && <p className="py-6 text-sm text-slate-500">No provider has three approved observations in this view.</p>}</div>
      </section>
      <aside className="border-l-4 border-[#FF4500] bg-[#fff8f4] p-5 sm:p-6"><Radio size={20} className="text-[#c53a00]" /><h2 className="mt-3 text-lg font-bold text-slate-950">Independent Reddit sample</h2><p className="mt-2 text-sm leading-6 text-slate-700">A curated snapshot of r/PakistaniTech posts. It is not a representative survey, operator ranking, or promise of coverage.</p><dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Mean</dt><dd className="font-semibold">{metric(summary.meanDownload, "Mbps")}</dd></div><div><dt className="text-slate-500">P90</dt><dd className="font-semibold">{metric(summary.p90Download, "Mbps")}</dd></div><div><dt className="text-slate-500">Needs review</dt><dd className="font-semibold">{summary.needsReviewCount}</dd></div><div><dt className="text-slate-500">Unresolved</dt><dd className="font-semibold">{summary.unresolvedCount}</dd></div></dl><Link href="/insights/reddit-speedtests" className="mt-6 inline-flex min-h-11 items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">View details <ArrowRight size={16} /></Link></aside>
    </div>
  </>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) { return <div className="min-w-0 border-b border-r border-slate-200 p-4 last:border-r-0 md:border-b-0 sm:p-5"><Icon size={18} className="text-[#d63c00]"/><p className="mt-3 break-words font-mono text-xl font-bold text-slate-950 sm:text-2xl">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label}</p></div>; }
