import type { CoverageCell } from "@/features/coverage-reports/types";

export function cellPopupHtml(cell: CoverageCell): string {
  const mkSpeed = (val: number | null) => (val !== null ? `${Math.round(val)} Mbps` : "<span style='color:#bbb'>No data</span>");

  const speeds = [
    { op: "Ufone", avg: cell.ufoneAvgDownload, count: cell.ufoneCount },
    { op: "Zong", avg: cell.zongAvgDownload, count: cell.zongCount },
    { op: "Jazz", avg: cell.jazzAvgDownload, count: cell.jazzCount },
  ].sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  const rows = speeds.map((s, idx) => {
    const isWinner = s.avg !== null && idx === 0 && s.avg > 0;
    return `<div style="display:flex; justify-content:space-between; margin-bottom:2px">
      <span style="font-weight:${isWinner ? '600' : '400'}">${s.op} ${isWinner ? '🏆' : ''}</span>
      <span>${mkSpeed(s.avg)} <span style="font-size:10px; color:#9ca3af">(${s.count})</span></span>
    </div>`;
  }).join("");

  return `
    <div style="font-family: system-ui; font-size: 12px; color: #374151; min-width: 170px">
      <div style="font-weight:600; margin-bottom:6px; border-bottom:1px solid #e5e7eb; padding-bottom:4px">
        Location Coverage (${cell.total} tests)
      </div>
      <div style="margin-bottom:6px">
        ${rows}
      </div>
      <div style="color:#9ca3af; font-size:11px; text-align:right">Trust ⭐ ${cell.avgTrust.toFixed(2)}</div>
    </div>`;
}
