import Link from "next/link";
import type { ReactNode } from "react";

const effectiveDate = "9 August 2026";
const contactEmail = process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL ?? "privacy@5gpakistan.app";

export function LegalLayout({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <main className="h-full overflow-y-auto bg-[#f4f5f6] px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10"><article className="mx-auto w-full max-w-6xl pb-8 sm:pb-10"><header className="rounded-2xl bg-slate-950 px-5 py-5 text-white shadow-[0_12px_30px_rgba(15,23,42,.1)] sm:px-7 sm:py-6 lg:px-8"><p className="text-[10px] font-bold tracking-[.14em] text-[#77e8bd]">{eyebrow}</p><h1 className="mt-2 max-w-3xl text-2xl font-bold tracking-[-.04em] sm:text-3xl lg:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-5 text-slate-300">{intro}</p><p className="mt-4 text-[11px] font-medium text-slate-400">Effective: {effectiveDate}</p></header><div className="mt-3 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:mt-4 sm:rounded-[1.75rem] sm:p-8 lg:p-10"><div className="legal-copy divide-y divide-slate-100 text-sm leading-6 text-slate-600">{children}</div><div className="mt-8 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500 sm:mt-10">Questions about these documents or your information? Contact <a className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</div><nav className="mt-5 flex gap-4 text-sm font-semibold text-slate-900"><Link href="/privacy" className="hover:text-slate-600">Privacy</Link><Link href="/terms" className="hover:text-slate-600">Terms</Link></nav></div></article></main>;
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) { return <section className="py-7 first:pt-0 last:pb-0 sm:py-8 lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-8"><h2 className="text-base font-bold tracking-[-.02em] text-slate-950 sm:text-lg">{title}</h2><div className="mt-2 lg:mt-0">{children}</div></section>; }
export function LegalList({ children }: { children: ReactNode }) { return <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-slate-400">{children}</ul>; }
