"use client";

import { useEffect, useState } from "react";
import { OPERATORS, type IncidentSummary } from "@/features/network-status/types";

export default function HistoryDashboard() {
  const [days, setDays] = useState<7 | 30>(7);
  const [operator, setOperator] = useState("all");
  const [items, setItems] = useState<IncidentSummary[]>([]);

  useEffect(() => {
    const query = new URLSearchParams({ days: String(days) });
    if (operator !== "all") query.set("operator", operator);
    void fetch("/api/network-status/history?" + query)
      .then((response) => response.json())
      .then((data) => setItems(data.incidents ?? []))
      .catch(() => setItems([]));
  }, [days, operator]);

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const minutes = items.reduce((sum, item) => sum + item.totalAffectedMinutes, 0);
  const durations = items.map((item) => item.medianDurationMinutes).filter((value): value is number => value !== null).sort((a, b) => a - b);
  const median = durations.length ? `${Math.round(durations[Math.floor(durations.length / 2)])} min` : "—";

  return <main className="h-full overflow-y-auto bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-medium text-blue-700">Community signals, not forecasts</p>
      <h1 className="mt-1 text-3xl font-bold">History &amp; trends</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="rounded-full bg-slate-200 p-1">
          <button onClick={() => setDays(7)} className={`min-h-10 rounded-full px-4 text-sm ${days === 7 ? "bg-white font-semibold shadow-sm" : "text-slate-600"}`}>7 days</button>
          <button onClick={() => setDays(30)} className={`min-h-10 rounded-full px-4 text-sm ${days === 30 ? "bg-white font-semibold shadow-sm" : "text-slate-600"}`}>30 days</button>
        </div>
        <select aria-label="Operator" value={operator} onChange={(event) => setOperator(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="all">All operators</option>{OPERATORS.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[ ["Incident count", total], ["Median duration", median], ["Total affected time", `${Math.round(minutes / 60)} hrs`] ].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">Issue-type breakdown</h2>{items.length ? <div className="mt-4 divide-y divide-slate-100">{items.map((item) => <div key={`${item.operator}-${item.status}`} className="flex items-center justify-between gap-3 py-4 text-sm"><span className="font-medium">{item.operator} · {item.status.replace("_", " ")}</span><span className="text-slate-600">{Object.values(item.issueBreakdown).reduce((sum, value) => sum + (value ?? 0), 0)} reports</span></div>)}</div> : <p className="mt-4 text-sm text-slate-600">Not enough historical reports yet.</p>}</section>
    </div>
  </main>;
}
