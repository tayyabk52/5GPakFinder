"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Search, SlidersHorizontal } from "lucide-react";
import { columnFilteringFeature, createColumnHelper, createFilteredRowModel, createPaginatedRowModel, createSortedRowModel, filterFns, globalFilteringFeature, rowPaginationFeature, rowSortingFeature, sortFns, tableFeatures, useTable, type SortingState } from "@tanstack/react-table";
import type { RedditObservation, ReviewStatus } from "../types";

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
});
const helper = createColumnHelper<typeof features, RedditObservation>();
const format = (value: number | null, unit = "") => value == null ? "-" : `${Number(value.toFixed(1))}${unit}`;
const statusTone: Record<ReviewStatus, string> = { approved: "bg-emerald-50 text-emerald-800", needs_review: "bg-amber-50 text-amber-900", unresolved: "bg-slate-100 text-slate-700", excluded: "bg-rose-50 text-rose-800" };

export default function ObservationsTable({ rows }: { rows: RedditObservation[] }) {
  const [view, setView] = useState<"measurements" | "sources">("measurements");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ReviewStatus | "all">("all");
  const [generation, setGeneration] = useState<"all" | "4g" | "5g">("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const filtered = useMemo(() => rows.filter((row) => (view === "sources" || row.reviewStatus === "approved") && (status === "all" || row.reviewStatus === status) && (generation === "all" || row.generation === generation)), [rows, view, status, generation]);
  const columns = useMemo(() => helper.columns([
    helper.accessor("createdAt", { header: "Date", cell: (info) => new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(info.getValue())) }),
    helper.accessor("reportedBrand", { header: "Operator", cell: (info) => <div><p className="font-semibold text-slate-950">{info.getValue() ?? "Unknown"}</p><p className="text-xs text-slate-500">{info.row.original.generation?.toUpperCase() ?? info.row.original.accessType}</p></div> }),
    helper.accessor("city", { header: "Location", cell: (info) => <div><p className="font-medium text-slate-900">{[info.row.original.area, info.getValue()].filter(Boolean).join(", ") || "Not stated"}</p><p className="text-xs text-slate-500">{info.row.original.locationMethod.replaceAll("_", " ")} · {info.row.original.locationConfidence}</p></div> }),
    helper.accessor("downloadMbps", { header: "Download", cell: (info) => <span className="font-mono font-bold text-slate-950">{format(info.getValue(), " Mbps")}</span> }),
    helper.accessor("uploadMbps", { header: "Upload", cell: (info) => format(info.getValue(), " Mbps") }),
    helper.accessor("pingMs", { header: "Ping", cell: (info) => format(info.getValue(), " ms") }),
    helper.accessor("reviewStatus", { header: "Review", cell: (info) => <span className={`inline-flex px-2 py-1 text-xs font-bold ${statusTone[info.getValue()]}`}>{info.getValue().replace("_", " ")}</span> }),
    helper.display({ id: "view", header: "", cell: (info) => <Link aria-label={`View ${info.row.original.title}`} className="inline-flex min-h-10 items-center gap-1.5 px-2 font-bold text-[#b83200] hover:underline" href={`/insights/reddit-speedtests/${info.row.original.postId}`}>View <ExternalLink size={14}/></Link> }),
  ]), []);
  const table = useTable({ features, data: filtered, columns, state: { sorting, globalFilter: query }, onSortingChange: setSorting, onGlobalFilterChange: setQuery, initialState: { pagination: { pageIndex: 0, pageSize: 25 } } });
  const hiddenMobile = (id: string) => ["createdAt", "uploadMbps", "pingMs", "reviewStatus"].includes(id) ? "hidden md:table-cell" : "";
  return <section aria-labelledby="records-title" className="mt-6 border border-slate-200 bg-white">
    <div className="border-b border-slate-200 p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 id="records-title" className="text-xl font-bold text-slate-950">Dataset records</h2><p className="mt-1 text-sm text-slate-600">Measurements and the complete source-post review ledger.</p></div><div className="grid grid-cols-2 border border-slate-300 p-1"><button className={`min-h-10 px-3 text-sm font-bold ${view === "measurements" ? "bg-slate-950 text-white" : "text-slate-600"}`} onClick={() => setView("measurements")}>Measurements</button><button className={`min-h-10 px-3 text-sm font-bold ${view === "sources" ? "bg-slate-950 text-white" : "text-slate-600"}`} onClick={() => setView("sources")}>All source posts</button></div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_150px_150px]"><label className="relative"><Search aria-hidden className="absolute left-3 top-3 text-slate-400" size={18}/><span className="sr-only">Search records</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search operator, city, or title" className="min-h-11 w-full border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-slate-950"/></label><label><span className="sr-only">Review status</span><select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm"><option value="all">All statuses</option><option value="approved">Approved</option><option value="needs_review">Needs review</option><option value="unresolved">Unresolved</option><option value="excluded">Excluded</option></select></label><label><span className="sr-only">Technology</span><select value={generation} onChange={(e) => setGeneration(e.target.value as typeof generation)} className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm"><option value="all">All technology</option><option value="5g">5G</option><option value="4g">4G / 4G+</option></select></label></div>
    </div>
    <div className="overflow-x-auto"><table className="w-full table-fixed border-collapse text-left text-sm md:table-auto"><thead className="sticky top-0 bg-slate-50"><tr>{table.getHeaderGroups()[0].headers.map((header) => <th key={header.id} className={`border-b border-slate-200 px-2 py-3 text-xs font-bold uppercase text-slate-500 sm:px-4 ${hiddenMobile(header.column.id)}`}><button className="inline-flex items-center gap-1" onClick={header.column.getToggleSortingHandler()}><table.FlexRender header={header}/>{header.column.getCanSort() && <SlidersHorizontal size={12}/>}</button></th>)}</tr></thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className="border-b border-slate-100 align-top hover:bg-slate-50">{row.getAllCells().map((cell) => <td key={cell.id} className={`break-words px-2 py-3 sm:px-4 ${hiddenMobile(cell.column.id)}`}><table.FlexRender cell={cell}/></td>)}</tr>)}</tbody></table>{!table.getRowModel().rows.length && <p className="p-8 text-center text-sm text-slate-500">No records match these filters.</p>}</div>
    <div className="flex items-center justify-between gap-3 p-4 text-sm"><p className="text-slate-500">{filtered.length} records · page {table.state.pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</p><div className="flex gap-1"><button aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} className="grid h-11 w-11 place-items-center border border-slate-300 disabled:opacity-30"><ChevronLeft size={18}/></button><button aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} className="grid h-11 w-11 place-items-center border border-slate-300 disabled:opacity-30"><ChevronRight size={18}/></button></div></div>
  </section>;
}
