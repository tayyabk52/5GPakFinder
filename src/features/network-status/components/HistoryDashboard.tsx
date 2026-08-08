"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Clock3, Signal, type LucideIcon } from "lucide-react";
import { OPERATORS, type HistoryDay, type HistoryOverview, type IncidentSummary } from "@/features/network-status/types";

const issueLabels: Record<string, string> = { no_signal: "No signal", no_internet: "No internet", slow_data: "Slow data", calls_sms: "Calls/SMS", specific_app: "Specific app" };
const blankOverview: HistoryOverview = { incidentCount: 0, medianDurationMinutes: null, totalAffectedMinutes: 0 };

export default function HistoryDashboard() {
  const [days, setDays] = useState<7 | 30>(7);
  const [operator, setOperator] = useState("all");
  const [items, setItems] = useState<IncidentSummary[]>([]);
  const [daily, setDaily] = useState<HistoryDay[]>([]);
  const [overview, setOverview] = useState<HistoryOverview>(blankOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ days: String(days) });
    if (operator !== "all") query.set("operator", operator);
    setLoading(true); setError("");
    void fetch("/api/network-status/history?" + query, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "History is temporarily unavailable.");
        setItems(data.incidents ?? []); setDaily(data.daily ?? []); setOverview(data.overview ?? blankOverview);
      })
      .catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) { setItems([]); setDaily([]); setOverview(blankOverview); setError(reason instanceof Error ? reason.message : "History is temporarily unavailable."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, operator]);

  const maxDaily = Math.max(1, ...daily.map((item) => item.incidentCount));
  const breakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const item of items) for (const [issue, count] of Object.entries(item.issueBreakdown)) totals[issue] = (totals[issue] ?? 0) + (count ?? 0);
    return Object.entries(totals).sort(([, a], [, b]) => b - a);
  }, [items]);
  const metrics: Array<{ label: string; value: string | number; icon: LucideIcon }> = [
    { label: "Incident count", value: overview.incidentCount, icon: Signal },
    { label: "Median duration", value: overview.medianDurationMinutes === null ? "—" : `${Math.round(overview.medianDurationMinutes)} min`, icon: Clock3 },
    { label: "Total affected time", value: `${Math.round(overview.totalAffectedMinutes / 60)} hrs`, icon: BarChart3 },
  ];

  return <main className="h-full overflow-y-auto bg-[#f4f5f6] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
    <div className="mx-auto max-w-6xl">
      <div className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7"><p className="text-xs font-bold tracking-[.14em] text-slate-500">COMMUNITY SIGNALS · NO FORECASTS</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">History &amp; trends</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">A privacy-preserving view of past community incidents and the issues reported most often.</p><div className="mt-6 flex flex-wrap items-center gap-3"><div className="rounded-2xl bg-slate-100 p-1.5" role="group" aria-label="History period">{([7, 30] as const).map((value) => <button key={value} type="button" onClick={() => setDays(value)} className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${days === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>{value} days</button>)}</div><select aria-label="Operator" value={operator} onChange={(event) => setOperator(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#49cbeb]"> <option value="all">All operators</option>{OPERATORS.map((item) => <option key={item}>{item}</option>)}</select></div></div>
      {error && <div role="alert" className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle size={18} />{error}</div>}
      <section className="mt-4 grid gap-3 sm:grid-cols-3">{metrics.map(({ label, value, icon: MetricIcon }) => <article key={label} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><MetricIcon size={18} className="text-slate-500"/><p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{loading ? "…" : String(value)}</p><p className="mt-1 text-sm font-medium text-slate-600">{label}</p></article>)}</section>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.14em] text-slate-500">DAILY ACTIVITY</p><h2 className="mt-1 text-xl font-bold tracking-tight">New incidents</h2></div><span className="text-xs font-semibold text-slate-500">{days} days</span></div>{daily.length ? <div className="mt-7 flex h-36 items-end gap-1.5" aria-label="Daily incident count chart">{daily.map((item) => <div key={item.day} className="group flex h-full min-w-0 flex-1 flex-col justify-end"><span className="mb-2 text-center text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">{item.incidentCount}</span><div title={`${item.day}: ${item.incidentCount} incident${item.incidentCount === 1 ? "" : "s"}`} className="min-h-1 rounded-t-md bg-[#49cbeb] transition hover:bg-[#249fbe]" style={{ height: `${Math.max(6, (item.incidentCount / maxDaily) * 100)}%` }} /></div>)}</div> : <p className="mt-6 rounded-2xl bg-[#f4f5f6] p-5 text-sm text-slate-600">{loading ? "Loading history…" : "No qualifying incidents were recorded in this period."}</p>}</section>
        <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"><p className="text-xs font-bold tracking-[.14em] text-slate-500">ISSUE BREAKDOWN</p><h2 className="mt-1 text-xl font-bold tracking-tight">What people reported</h2>{breakdown.length ? <div className="mt-5 space-y-3">{breakdown.map(([issue, count]) => <div key={issue}><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-800">{issueLabels[issue] ?? issue}</span><span className="text-slate-500">{count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#77e8bd]" style={{ width: `${Math.max(8, (count / breakdown[0][1]) * 100)}%` }}/></div></div>)}</div> : <p className="mt-6 rounded-2xl bg-[#f4f5f6] p-5 text-sm text-slate-600">{loading ? "Loading issue types…" : "No issue types are available for this period."}</p>}</section>
      </div>
    </div>
  </main>;
}
