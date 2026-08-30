import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, ExternalLink, MapPinned } from "lucide-react";
import Breadcrumbs, { type BreadcrumbItem } from "@/components/Breadcrumbs";

export function CoveragePageFrame({ children }: { children: React.ReactNode }) {
  return <main className="h-full overflow-y-auto bg-[#f4f5f6]"><div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">{children}</div></main>;
}

export function CoverageHeader({ eyebrow, title, description, breadcrumbs, primaryHref, primaryLabel }: {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return <>
    <Breadcrumbs items={breadcrumbs} />
    <header className="mt-5 border-y border-slate-200 bg-white px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-xs font-bold uppercase text-[#157b98]">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-3xl font-bold text-slate-950 sm:text-4xl lg:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
      {primaryHref && primaryLabel && <Link href={primaryHref} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800">{primaryLabel}<ArrowRight size={17}/></Link>}
    </header>
  </>;
}

export function QuickAnswer({ children }: { children: React.ReactNode }) {
  return <section className="border-b border-slate-200 bg-[#eaf6f8] px-5 py-6 sm:px-8"><div className="flex items-start gap-3"><CheckCircle2 size={22} className="mt-0.5 shrink-0 text-[#126c85]"/><div><h2 className="text-lg font-bold text-slate-950">Quick answer</h2><div className="mt-1 max-w-4xl text-sm leading-6 text-slate-700">{children}</div></div></div></section>;
}

export function Metrics({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">{items.map((item) => <div key={item.label} className="bg-white p-5"><p className="font-mono text-3xl font-bold text-slate-950">{item.value}</p><p className="mt-1 text-sm font-semibold text-slate-600">{item.label}</p></div>)}</div>;
}

export function ContentSection({ id, title, children, tone = "plain" }: { id?: string; title: string; children: React.ReactNode; tone?: "plain" | "band" }) {
  return <section id={id} className={tone === "band" ? "border-y border-slate-200 bg-white px-5 py-8 sm:px-8" : "py-8"}><h2 className="text-2xl font-bold text-slate-950">{title}</h2><div className="mt-4 text-sm leading-6 text-slate-600">{children}</div></section>;
}

export function EvidenceNote({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-3 border-l-4 border-[#157b98] bg-white px-5 py-4"><Database size={19} className="mt-0.5 shrink-0 text-[#157b98]"/><p className="text-sm leading-6 text-slate-700">{children}</p></div>;
}

export function RelatedLinks({ links }: { links: Array<{ href: string; title: string; text: string }> }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{links.map((link) => <Link key={link.href} href={link.href} className="group rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-400"><span className="flex items-center justify-between gap-3 font-bold text-slate-950">{link.title}<ArrowRight size={16} className="transition group-hover:translate-x-1"/></span><span className="mt-2 block text-sm leading-6 text-slate-600">{link.text}</span></Link>)}</div>;
}

export function MapAction({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"><MapPinned size={17}/>{children}<ArrowRight size={16}/></Link>;
}

export function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#126c85] underline underline-offset-2">{children}<ExternalLink size={13}/></a>;
}

export function formatCoverageDate(date: string) {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "long", timeZone: "Asia/Karachi" }).format(new Date(`${date}T00:00:00+05:00`));
}
