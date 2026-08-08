"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, ChartNoAxesCombined, ChevronRight, House, Map, Menu, PanelLeftClose, X } from "lucide-react";
import { useState } from "react";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/map", label: "Map", icon: Map },
  { href: "/network-status", label: "Network status", icon: Activity },
  { href: "/network-history", label: "History", icon: BarChart3 },
  { href: "/insights", label: "Insights", icon: ChartNoAxesCombined },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Brand({ collapsed = false, compact = false }: { collapsed?: boolean; compact?: boolean }) {
  return <Link href="/" aria-label="5GPak home" className={`group flex min-w-0 items-center gap-3 rounded-2xl ${compact ? "" : "p-1.5"}`}>
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[1rem] bg-[#1d1d1d] shadow-[0_5px_14px_rgba(15,23,42,.16)] ${compact ? "h-9 w-9" : "h-11 w-11"}`}>
      <Image src="/icon.png" alt="" width={44} height={44} priority className="h-full w-full object-cover" />
    </span>
    {!collapsed && <span className="min-w-0 whitespace-nowrap"><span className="block text-[15px] font-bold tracking-[-.03em] text-slate-950">5GPak</span><span className="mt-0.5 block text-[10px] font-medium tracking-[.08em] text-slate-400">NETWORK COMPANION</span></span>}
  </Link>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed((value) => !value);

  const navigation = (mobile = false) => <nav className={mobile ? "space-y-2" : "space-y-1.5"} aria-label="Primary navigation">
    {!collapsed && !mobile && <p className="mb-3 px-3 text-[10px] font-bold tracking-[.16em] text-slate-400">EXPLORE</p>}
    {items.map(({ href, label, icon: Icon }) => {
      const selected = isActive(pathname, href);
      const compact = !mobile && collapsed;
      return <Link key={href} href={href} onClick={mobile ? () => setOpen(false) : undefined} aria-current={selected ? "page" : undefined} title={compact ? label : undefined} className={`group relative flex min-h-11 items-center rounded-xl transition-[background-color,color,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#49cbeb] ${compact ? "justify-center px-2" : mobile ? "min-h-[3.25rem] gap-3 rounded-2xl px-3.5" : "gap-3 px-3"} ${selected ? "bg-slate-950 text-white shadow-[0_5px_13px_rgba(15,23,42,.14)]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 active:scale-[.98]"}`}>
        <Icon size={19} strokeWidth={selected ? 2.25 : 1.9} className="shrink-0" />
        {!compact && <span className="min-w-0"><span className="block text-sm font-semibold tracking-[-.01em]">{label}</span></span>}
        {selected && !compact && !mobile && <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-[#77e8bd]" />}
      </Link>;
    })}
  </nav>;

  const sidebarWidth = collapsed ? "lg:pl-[5.75rem]" : "lg:pl-[17rem]";

  return <div className="h-dvh bg-[#f4f5f6] text-slate-900">
    <header className="fixed inset-x-0 top-0 z-[70] flex h-[4.25rem] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-2.5"><button type="button" aria-label="Open navigation" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"><Menu size={19} /></button><Brand compact /></div>
      <Link href="/network-status" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800">Status</Link>
    </header>

    <aside aria-label="Primary navigation" className={`fixed inset-y-0 left-0 z-[70] hidden flex-col border-r border-slate-200/80 bg-white py-5 transition-[width,padding] duration-300 ease-out lg:flex ${collapsed ? "w-[5.75rem] px-3" : "w-[17rem] px-4"}`}>
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}><Brand collapsed={collapsed} />{!collapsed && <button type="button" onClick={toggleSidebar} aria-label="Collapse sidebar" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"><PanelLeftClose size={18} /></button>}</div>
      {collapsed && <button type="button" onClick={toggleSidebar} aria-label="Expand sidebar" title="Expand sidebar" className="mx-auto mt-5 grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"><ChevronRight size={18} /></button>}
      <div className="mt-9">{navigation()}</div>
      <div className={`mt-auto border-t border-slate-100 pt-4 ${collapsed ? "text-center" : "px-2"}`}>
        {!collapsed ? <><p className="text-xs font-medium leading-5 text-slate-500">Community data, kept anonymous.</p><Link href="/network-status" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-900 transition hover:text-slate-600">Network status <ChevronRight size={14} /></Link></> : <Link href="/network-status" title="Network status" className="mx-auto grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"><Activity size={18} /></Link>}
      </div>
    </aside>

    {open && <div className="app-backdrop fixed inset-0 z-[80] bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)}><aside role="dialog" aria-modal="true" aria-label="Navigation" className="app-drawer-enter flex h-full w-full flex-col bg-white px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><Brand /><button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"><X size={19} /></button></div><div className="mt-7 border-t border-slate-100 pt-5">{navigation(true)}</div><div className="mt-auto rounded-2xl bg-[#f4f5f6] p-5"><p className="text-xs font-semibold text-slate-700">Private by design</p><p className="mt-1 text-xs leading-5 text-slate-500">Community reports are anonymous and shown only as aggregated area signals.</p></div></aside></div>}

    <main className={`h-full pt-[4.25rem] transition-[padding] duration-300 ease-out lg:pt-0 ${sidebarWidth}`}><div key={pathname} className="app-page-enter h-full">{children}</div></main>
  </div>;
}
