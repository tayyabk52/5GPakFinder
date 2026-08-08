"use client";

import { useEffect, useState } from "react";
import { Activity, Check, CircleAlert, Clock3, LoaderCircle, MapPin, Send, ShieldCheck } from "lucide-react";
import { useFingerprint } from "@/features/coverage-reports/fingerprint/useFingerprint";
import { ISSUE_TYPES, OPERATORS, type IncidentSummary, type NetworkOperator, type OutageSubmission } from "@/features/network-status/types";
import { isPakistanLocation, requestReportLocation, type ReportLocation } from "@/features/network-status/location";

const labels: Record<string, string> = {
  no_signal: "No signal", no_internet: "No internet", slow_data: "Slow data",
  calls_sms: "Calls or SMS", specific_app: "A specific app",
};

const signalStyle = {
  possible: { label: "Possible issue", icon: CircleAlert, surface: "bg-[#fff2d8]", iconSurface: "bg-[#f8b84d]", text: "text-[#744b00]" },
  high_agreement: { label: "High agreement", icon: Activity, surface: "bg-[#fee6e2]", iconSurface: "bg-[#ef6e61]", text: "text-[#84251e]" },
  recovering: { label: "Recovering", icon: Check, surface: "bg-[#daf5e8]", iconSurface: "bg-[#40b985]", text: "text-[#126344]" },
} as const;

function loadStoredLocation(): ReportLocation | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem("adjusted-map-location") ?? "null") as { latitude?: number; longitude?: number };
    if (isPakistanLocation(saved.latitude ?? NaN, saved.longitude ?? NaN)) {
      return { latitude: saved.latitude!, longitude: saved.longitude!, accuracyMeters: null, isManualPin: true };
    }
  } catch { /* Ignore an invalid session value. */ }
  return null;
}

function StatusMetric({ status, incident }: { status: keyof typeof signalStyle; incident?: IncidentSummary }) {
  const style = signalStyle[status];
  const Icon = style.icon;
  return <article className={`${style.surface} min-h-36 rounded-[1.5rem] p-4 sm:p-5`}>
    <div className="flex items-center justify-between">
      <span className={`grid h-9 w-9 place-items-center rounded-2xl ${style.iconSurface} text-white shadow-sm`}><Icon size={18} strokeWidth={2.5} /></span>
      <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
    </div>
    <p className={`mt-5 text-3xl font-bold tracking-tight ${style.text}`}>{incident?.count ?? 0}</p>
    <p className={`mt-0.5 text-sm font-medium ${style.text}`}>affected area{incident?.count === 1 ? "" : "s"}</p>
  </article>;
}

export default function StatusDashboard() {
  const [operator, setOperator] = useState<NetworkOperator>("Jazz");
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [state, setState] = useState<"affected" | "working">("affected");
  const [issue, setIssue] = useState("no_signal");
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { fingerprint, isReady: fingerprintReady } = useFingerprint();

  const load = () => void fetch(`/api/network-status/history?days=7&operator=${operator}`)
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((data) => setIncidents(data.incidents ?? []))
    .catch(() => setIncidents([]));

  useEffect(load, [operator]);
  useEffect(() => { const stored = loadStoredLocation(); if (stored) setLocation(stored); }, []);

  const ensureLocation = async () => {
    const stored = loadStoredLocation();
    if (stored) { setLocation(stored); return stored; }
    try {
      const gps = await requestReportLocation();
      sessionStorage.setItem("adjusted-map-location", JSON.stringify({ latitude: gps.latitude, longitude: gps.longitude }));
      setLocation(gps);
      return gps;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Location is unavailable.");
      return null;
    }
  };

  const submit = async () => {
    const reportLocation = location ?? await ensureLocation();
    if (!reportLocation) return;
    if (!fingerprintReady || !fingerprint) {
      setMessage("Preparing anonymous report protection. Please try again in a moment.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const payload: OutageSubmission = {
        latitude: reportLocation.latitude, longitude: reportLocation.longitude,
        accuracyMeters: reportLocation.accuracyMeters, isManualPin: reportLocation.isManualPin,
        operator, state, issueType: state === "affected" ? issue as OutageSubmission["issueType"] : null,
        deviceFingerprint: fingerprint,
      };
      const response = await fetch("/api/network-status/reports", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      setMessage(result.ok ? "Your anonymous signal was recorded. Thank you." : result.reason ?? "Report unavailable. Please try again.");
      if (result.ok) load();
    } catch {
      setMessage("Could not reach the reporting service. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const active = incidents.filter((item) => item.status !== "resolved");
  const selectedIssue = issue as OutageSubmission["issueType"];

  return <main className="h-full overflow-y-auto bg-[#f4f5f6] px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-10">
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#1d1d1d] px-5 py-6 text-white shadow-[0_18px_45px_rgba(15,23,42,.12)] sm:px-8 sm:py-9">
        <div aria-hidden className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[#49cbeb] opacity-80" />
        <div aria-hidden className="absolute -bottom-20 right-24 h-36 w-36 rounded-full bg-[#77e8bd] opacity-50" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15"><Activity size={14} /> COMMUNITY AVAILABILITY</div>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">A clearer view of your network.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Anonymous local signals help identify possible disruptions. They are never operator-confirmed outages.</p>
        </div>
      </section>

      <section className="mt-4 rounded-[1.5rem] bg-white p-2 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Choose network operator">
          {OPERATORS.map((item) => <button key={item} type="button" role="tab" aria-selected={operator === item} onClick={() => setOperator(item)} className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#49cbeb] ${operator === item ? "bg-[#1d1d1d] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>{item === "Ufone" ? "Ufone / Onic" : item}</button>)}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-4" aria-label={`${operator} status summary`}>
        {(["possible", "high_agreement", "recovering"] as const).map((status) => <StatusMetric key={status} status={status} incident={active.find((item) => item.status === status)} />)}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)] lg:items-start">
        <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold tracking-[0.14em] text-slate-500">LIVE SUMMARY</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Affected areas</h2></div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{active.reduce((total, item) => total + item.count, 0)} active</span>
          </div>
          {active.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {active.map((item) => {
              const style = signalStyle[item.status as keyof typeof signalStyle];
              const Icon = style.icon;
              const issues = Object.entries(item.issueBreakdown).map(([key, value]) => `${labels[key] ?? key}: ${value}`).join(" · ");
              return <article key={item.status} className="rounded-2xl border border-slate-100 bg-[#fafafa] p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${style.iconSurface} text-white`}><Icon size={17} /></span><div><h3 className="font-semibold text-slate-900">{style.label}</h3><p className="text-xs text-slate-500">{item.count} affected area{item.count === 1 ? "" : "s"}</p></div></div>
                <p className="mt-4 text-sm leading-5 text-slate-600">{issues || "Availability reports are being grouped for this area."}</p>
              </article>;
            })}
          </div> : <div className="mt-5 rounded-2xl bg-[#f4f5f6] p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#bdebf6] text-slate-800"><ShieldCheck size={20} /></span><div><p className="font-semibold text-slate-900">Not enough reports yet</p><p className="mt-0.5 text-sm text-slate-600">Check later or share an anonymous availability signal.</p></div></div></div>}
          <div className="mt-5 flex items-start gap-3 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500"><Clock3 className="mt-0.5 shrink-0" size={15} /><p>Signals become resolved after 90 minutes without new affected reports. Three independent “working normally” reports can mark an area as recovering sooner.</p></div>
        </section>

        <section id="report" className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-slate-200/70 lg:sticky lg:top-6">
          <div className="bg-[#bdebf6] px-5 pb-5 pt-6 sm:px-6"><p className="text-xs font-bold tracking-[0.14em] text-slate-700">CONTRIBUTE A SIGNAL</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Report your network status</h2><p className="mt-2 text-sm leading-5 text-slate-700">Anonymous, availability-only, and based on your saved map location.</p></div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" aria-label="Choose report state">
              {[{ value: "affected", label: "I’m affected" }, { value: "working", label: "Working normally" }].map((option) => <button key={option.value} type="button" aria-pressed={state === option.value} onClick={() => setState(option.value as typeof state)} className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition duration-200 ${state === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{option.label}</button>)}
            </div>
            {state === "affected" && <fieldset className="mt-5"><legend className="text-sm font-semibold text-slate-800">What are you experiencing?</legend><div className="mt-3 grid grid-cols-2 gap-2">{ISSUE_TYPES.map((item) => <button key={item} type="button" aria-pressed={selectedIssue === item} onClick={() => setIssue(item)} className={`min-h-12 rounded-xl border px-3 text-left text-xs font-semibold transition duration-200 ${selectedIssue === item ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"}`}>{labels[item]}</button>)}</div></fieldset>}
            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f4f5f6] p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-700 shadow-sm"><MapPin size={18} /></span><div><p className="text-sm font-semibold text-slate-900">{location ? "Map location ready" : "Location used only when you submit"}</p><p className="mt-0.5 text-xs leading-5 text-slate-600">{location ? "Your current session location will be used anonymously." : "We use your saved map location, or request browser location at submission."}</p></div></div>
            <button type="button" disabled={submitting} onClick={submit} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d1d1d] px-5 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#49cbeb] focus-visible:ring-offset-2"><>{submitting ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={17} />}</> {submitting ? "Submitting signal…" : "Submit anonymous signal"}</button>
            <p aria-live="polite" className={`min-h-5 mt-3 text-center text-xs leading-5 ${message.includes("recorded") ? "text-emerald-700" : "text-slate-600"}`}>{message}</p>
          </div>
        </section>
      </div>
    </div>
  </main>;
}
