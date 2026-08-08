"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, ChartNoAxesCombined, ChevronLeft, ChevronRight, House, Map, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const items = [
  { href: "/", label: "Home", description: "Your network hub", icon: House },
  { href: "/map", label: "Map", description: "Coverage & sites", icon: Map },
  { href: "/network-status", label: "Network status", description: "Community signals", icon: Activity },
  { href: "/network-history", label: "History", description: "Past trends", icon: BarChart3 },
  { href: "/insights", label: "Insights", description: "Coverage & speeds", icon: ChartNoAxesCombined },
];

function isActive(pathname: string, href: string) { return href === "/" ? pathname === "/" : pathname.startsWith(href); }

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { setCollapsed(sessionStorage.getItem("sidebar-collapsed") === "true"); }, []);
  const toggleSidebar = () => setCollapsed((value) => { sessionStorage.setItem("sidebar-collapsed", String(!value)); return !value; });

  const navigation = (mobile = false) => <nav className="space-y-1.5" aria-label="Primary navigation">{items.map(({ href, label, description, icon: Icon }) => {
    const selected = isActive(pathname, href);
    const compact = !mobile && collapsed;
    return <Link key={label} href={href} aria-current={selected ? "page" : undefined} title={compact ? label : undefined} className={`group relative flex items-center rounded-xl border py-2.5 transition-all duration-200 ${compact ? "justify-center px-2" : "gap-3 px-3"} ${selected ? "border-slate-200 bg-slate-100 text-slate-950 shadow-sm" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-all duration-200 group-hover:scale-105 ${selected ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "bg-slate-100 text-slate-600 group-hover:bg-white group-hover:shadow-sm"}`}><Icon size={18} strokeWidth={2.25}/></span>
      {!compact && <span className="min-w-0 overflow-hidden whitespace-nowrap"><span className="block text-sm font-semibold">{label}</span>{!mobile && <span className="block text-xs text-slate-500">{description}</span>}</span>}
    </Link>;
  })}</nav>;

  const sidebarWidth = collapsed ? "lg:pl-20" : "lg:pl-64";
  return <div className="h-dvh bg-[#f4f5f6] text-slate-900">
    <header className="fixed inset-x-0 top-0 z-[70] flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl lg:hidden"><div className="flex items-center gap-2"><button type="button" aria-label="Open navigation" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4f5f6] text-slate-900 transition hover:bg-[#bdebf6] active:scale-95"><Menu size={21}/></button><Link href="/" className="flex items-center gap-2 font-bold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#1d1d1d] text-sm text-white">P</span>PakFinder</Link></div><Link href="/network-status" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">Status</Link></header>
    <aside aria-label="Primary navigation" className={`fixed inset-y-0 left-0 z-[70] hidden flex-col border-r border-slate-200/80 bg-white py-5 transition-[width,padding] duration-300 ease-out lg:flex ${collapsed ? "w-20 px-3" : "w-64 px-4"}`}>
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}><Link href="/" aria-label="PakFinder home" className="flex min-w-0 items-center gap-3 rounded-2xl p-2 transition hover:bg-slate-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1d1d1d] text-base font-bold text-white shadow-lg">P</span>{!collapsed && <span className="overflow-hidden whitespace-nowrap"><span className="block font-bold tracking-tight">PakFinder</span><span className="block text-xs text-slate-500">Network companion</span></span>}</Link>{!collapsed && <button type="button" onClick={toggleSidebar} aria-label="Collapse sidebar" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"><ChevronLeft size={18}/></button>}</div>
      {collapsed && <button type="button" onClick={toggleSidebar} aria-label="Expand sidebar" title="Expand sidebar" className="mx-auto mt-5 grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"><ChevronRight size={18}/></button>}
      <div className={collapsed ? "mt-8" : "mt-8"}>{navigation()}</div>
      {!collapsed && <div className="mt-auto border-t border-slate-100 px-2 pt-5"><p className="text-xs font-medium leading-5 text-slate-500">Anonymous community signals. No account required.</p><Link href="/network-status" className="mt-3 inline-flex text-xs font-semibold text-slate-900 underline underline-offset-4">View status</Link></div>}
    </aside>
    {open && <div className="app-backdrop fixed inset-0 z-[80] bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)}><aside role="dialog" aria-modal="true" aria-label="Navigation" className="app-drawer-enter flex h-full w-[min(21rem,88vw)] flex-col bg-white px-4 py-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-3 font-bold tracking-tight"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1d1d1d] text-lg text-white">P</span><span>PakFinder<span className="mt-0.5 block text-xs font-normal text-slate-500">Network companion</span></span></Link><button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4f5f6] transition hover:bg-slate-100"><X size={21}/></button></div><div className="mt-8">{navigation(true)}</div><div className="mt-auto border-t border-slate-100 px-2 pt-5"><p className="text-xs leading-5 text-slate-500">Community reports are anonymous and aggregated to protect privacy.</p></div></aside></div>}
    <main className={`h-full pt-16 transition-[padding] duration-300 ease-out lg:pt-0 ${sidebarWidth}`}><div key={pathname} className="app-page-enter h-full">{children}</div></main>
  </div>;
}
