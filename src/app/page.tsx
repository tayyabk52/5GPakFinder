import Link from "next/link";
import { ArrowRight, MapPinned, RadioTower, SatelliteDish, Send, ShieldCheck } from "lucide-react";

const actions = [
  { href: "/map", title: "Map", text: "Coverage & sites", icon: MapPinned, tone: "bg-[#bdebf6]", iconTone: "from-[#49cbeb] to-[#209bc2]" },
  { href: "/network-status", title: "Status", text: "Live signals", icon: RadioTower, tone: "bg-[#baf3d9]", iconTone: "from-[#71e3b1] to-[#25af7a]" },
  { href: "/network-history", title: "History", text: "Recent trends", icon: SatelliteDish, tone: "bg-[#ffe39a]", iconTone: "from-[#ffd970] to-[#e6aa26]" },
  { href: "/network-status", title: "Report", text: "Share availability", icon: Send, tone: "bg-[#e7ddff]", iconTone: "from-[#bba1f6] to-[#7d63cf]" },
];

export default function HomePage() {
  return <main className="h-full overflow-y-auto bg-[#f4f5f6] px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#1d1d1d] px-6 py-7 text-white shadow-lg sm:px-8 sm:py-9 lg:px-10">
        <div className="relative z-10 max-w-2xl"><p className="text-xs font-bold tracking-[0.14em] text-[#8de2f5]">PAKISTAN NETWORK COMPANION</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-5xl">A clearer view of your network.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Coverage information and privacy-preserving community availability signals, all in one place.</p><Link href="/map" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-[#bdebf6]">Open map <ArrowRight size={17}/></Link></div>
        <div aria-hidden className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#49cbeb] opacity-90"/><div aria-hidden className="absolute -bottom-28 right-20 h-52 w-52 rounded-full bg-[#77e8bd] opacity-60"/>
      </section>
      <section className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{actions.map(({href,title,text,icon:Icon,tone,iconTone}) => <Link key={title} href={href} className={`${tone} group relative min-h-40 overflow-hidden rounded-[1.5rem] p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:min-h-44 sm:p-5`}><div className={`grid h-11 w-11 place-items-center rounded-[0.9rem] bg-gradient-to-br ${iconTone} text-white shadow-[0_6px_14px_rgba(15,23,42,.16)] ring-1 ring-white/60`}><Icon size={22} strokeWidth={2.25}/></div><h2 className="mt-8 text-xl font-bold tracking-tight sm:mt-9 sm:text-2xl">{title}</h2><p className="mt-1 text-xs font-medium text-slate-700 sm:text-sm">{text}</p><span aria-hidden className="absolute bottom-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-white/60 text-slate-800 transition group-hover:translate-x-1 group-hover:bg-white"><ArrowRight size={16}/></span></Link>)}</section>
      <section className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-[1.2fr_.8fr]"><article className="rounded-[1.5rem] bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#bdebf6]"><ShieldCheck size={20}/></div><div><h2 className="font-semibold">Built around your privacy</h2><p className="text-sm text-slate-600">No account required.</p></div></div><p className="mt-4 text-sm leading-6 text-slate-600">Reports are anonymous. We show aggregated area signals, not individual locations, fingerprints, or IP data.</p></article><article className="rounded-[1.5rem] bg-[#baf3d9] p-5"><p className="text-xs font-bold tracking-[0.12em] text-slate-700">START WITH YOUR AREA</p><h2 className="mt-2 text-xl font-bold tracking-tight">Help make the signal useful.</h2><Link href="/network-status#report" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[#1d1d1d] px-4 text-sm font-semibold text-white">Report availability</Link></article></section>
    </div>
  </main>;
}
