"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, BarChart3, Gauge, MapPinned, RadioTower, ShieldCheck, Timer, type LucideIcon } from "lucide-react";
import type { NetworkGeneration } from "@/features/coverage-reports/types";

type OperatorInsight = { operator: string; reportCount: number; speedSampleCount: number; averageDownload: number | null; averageUpload: number | null; averagePing: number | null };
type CityInsight = { city: string; reportCount: number; speedSampleCount: number; averageDownload: number | null; averageUpload: number | null; averagePing: number | null; lastReportAt: string | null };
type Insights = { totalReports: number; speedSampleCount: number; averageDownload: number | null; averagePing: number | null; lastReportAt: string | null; operators: OperatorInsight[]; cities: CityInsight[] };
type InsightsResponse = { generation: NetworkGeneration; insights: Insights | null; error?: string };

const formatValue = (number: number | null, suffix = "") => number == null ? "-" : `${Math.round(number)}${suffix}`;
const formatDate = (time: string | null) => time ? new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" }).format(new Date(time)) : "No reports yet";

function evidence(count: number) {
  if (count >= 30) return ["Strong sample", "bg-[#daf5e8] text-[#126344]"] as const;
  if (count >= 10) return ["Growing sample", "bg-[#fff2d8] text-[#744b00]"] as const;
  if (count >= 3) return ["Early sample", "bg-[#e7f7fc] text-[#176177]"] as const;
  return ["Needs reports", "bg-slate-100 text-slate-500"] as const;
}

export default function InsightsDashboard() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState<NetworkGeneration>("5g");
  const technology = generation === "5g" ? "5G" : "4G LTE";
  const accent = generation === "5g" ? "bg-[#49cbeb]" : "bg-[#e5a936]";
  const activeTab = generation === "5g" ? "bg-[#bdebf6] text-slate-950" : "bg-[#fff0cf] text-slate-950";

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");

    void fetch(`/api/insights?generation=${generation}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as Partial<InsightsResponse>;
        if (!response.ok) throw new Error(body.error ?? "Insights are temporarily unavailable.");
        // Do not ever paint a late response from the other technology tab.
        if (body.generation === generation) setData(body.insights ?? null);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Insights are temporarily unavailable.");
      });

    return () => controller.abort();
  }, [generation]);

  const maxDownload = useMemo(() => Math.max(1, ...(data?.operators.map((item) => item.averageDownload ?? 0) ?? [0])), [data]);

  return (
    <main className="h-full overflow-y-auto bg-[#f4f5f6] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-6xl pb-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#1d1d1d] px-5 py-7 text-white shadow-[0_18px_45px_rgba(15,23,42,.12)] sm:px-8 sm:py-10">
          <div aria-hidden className="absolute -right-14 top-0 h-48 w-48 rounded-full bg-[#49cbeb] opacity-80" />
          <div aria-hidden className="absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-[#77e8bd] opacity-60" />
          <div className="relative max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold tracking-[.12em] text-white/90"><BarChart3 size={14} /> COVERAGE INSIGHTS</p>
            <h1 className="mt-4 text-3xl font-bold tracking-[-.04em] sm:text-4xl">See how the network feels, city by city.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">A privacy-preserving view of community coverage reports and optional measured speeds.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl bg-white/10 p-1" role="tablist" aria-label="Coverage technology">
                {(["5g", "4g"] as const).map((item) => (
                  <button key={item} type="button" role="tab" aria-selected={generation === item} onClick={() => setGeneration(item)} className={`min-h-9 rounded-lg px-3 text-xs font-bold transition ${generation === item ? activeTab : "text-white/70 hover:text-white"}`}>
                    {item === "5g" ? "5G insights" : "4G LTE insights"}
                  </button>
                ))}
              </div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${generation === "5g" ? "bg-[#49cbeb]/20 text-[#bdebf6]" : "bg-[#f7c96e]/20 text-[#fff0cf]"}`}>Showing {technology} community reports only</span>
            </div>
          </div>
        </section>

        {error && <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">{error}</div>}

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={RadioTower} label={`${technology} coverage reports`} text={data ? String(data.totalReports) : "..."} />
          <Metric icon={Gauge} label={`${technology} average download`} text={data ? formatValue(data.averageDownload, " Mbps") : "..."} />
          <Metric icon={Timer} label={`${technology} average latency`} text={data ? formatValue(data.averagePing, " ms") : "..."} />
          <Metric icon={ShieldCheck} label={`${technology} speed samples`} text={data ? String(data.speedSampleCount) : "..."} />
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
          <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.14em] text-slate-500">{technology} NETWORK COMPARISON</p><h2 className="mt-1 text-xl font-bold tracking-tight">Reported {technology} speed by provider</h2></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${generation === "5g" ? "bg-[#bdebf6] text-slate-700" : "bg-[#fff0cf] text-[#744b00]"}`}>Measured samples only</span></div>
            {data?.operators.length ? <div className="mt-7 space-y-5">{data.operators.map((item) => <div key={item.operator}><div className="flex items-end justify-between gap-3"><div><p className="font-semibold text-slate-900">{item.operator === "Ufone" ? "Ufone / Onic" : item.operator}</p><p className="mt-0.5 text-xs text-slate-500">{item.reportCount} {technology} reports · {item.speedSampleCount} speed samples</p></div><p className="text-lg font-bold tracking-tight text-slate-900">{formatValue(item.averageDownload, " Mbps")}</p></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${accent}`} style={{ width: `${Math.max(5, ((item.averageDownload ?? 0) / maxDownload) * 100)}%` }} /></div></div>)}</div> : <Empty text={`Provider comparisons will appear once ${technology} community reports are available.`} />}
          </section>
          <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><p className="text-xs font-bold tracking-[.14em] text-slate-500">HOW TO READ THIS</p><h2 className="mt-1 text-xl font-bold tracking-tight">Useful, not overstated</h2><div className="mt-6 space-y-4"><Info icon={MapPinned} title="Aggregated by city area" text="No individual coordinates, devices, or personal details are shown." /><Info icon={ArrowDownToLine} title="Speed tests are optional" text={`${data?.speedSampleCount ?? 0} ${technology} reports currently include measured speed.`} /><Info icon={ShieldCheck} title="Technology is kept separate" text={`Only ${technology} reports are used in this view. They never change the other technology's results.`} /></div><p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Latest {technology} community report: {formatDate(data?.lastReportAt ?? null)}</p></section>
        </div>

        <section className="mt-4 rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold tracking-[.14em] text-slate-500">{technology} CITY SNAPSHOTS</p><h2 className="mt-1 text-xl font-bold tracking-tight">Community {technology} samples in major cities</h2><p className="mt-1 text-sm text-slate-600">These are local {technology} report samples, not population-wide rankings or operator promises.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">3+ reports unlock metrics</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data?.cities.map((city) => <CityCard key={city.city} city={city} />) ?? <Empty text={`Loading ${technology} city snapshots...`} />}</div></section>
      </div>
    </main>
  );
}

function CityCard({ city }: { city: CityInsight }) {
  const [label, tone] = evidence(city.reportCount);
  return <article className="rounded-2xl bg-[#f4f5f6] p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{city.city}</h3><p className="mt-1 text-xs text-slate-500">Last report: {formatDate(city.lastReportAt)}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{label}</span></div><div className="mt-5 grid grid-cols-2 gap-2 border-y border-slate-200 py-3"><Stat label="Coverage reports" text={String(city.reportCount)} /><Stat label="Speed samples" text={String(city.speedSampleCount)} /></div>{city.reportCount >= 3 ? <div className="mt-4 grid grid-cols-3 gap-2 text-center"><Stat label="Download" text={formatValue(city.averageDownload)} /><Stat label="Upload" text={formatValue(city.averageUpload)} /><Stat label="Ping" text={formatValue(city.averagePing)} /></div> : <p className="mt-4 text-sm leading-5 text-slate-500">Help establish a useful local snapshot by sharing a coverage report.</p>}</article>;
}

function Metric({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) { return <article className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5"><Icon size={18} className="text-slate-500" /><p className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{text}</p><p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{label}</p></article>; }
function Stat({ label, text }: { label: string; text: string }) { return <div><p className="text-base font-bold tracking-tight text-slate-900">{text}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="mt-5 rounded-2xl bg-[#f4f5f6] p-5 text-sm leading-5 text-slate-600">{text}</p>; }
function Info({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) { return <div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#bdebf6] text-slate-700"><Icon size={17} /></span><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-0.5 text-sm leading-5 text-slate-600">{text}</p></div></div>; }
