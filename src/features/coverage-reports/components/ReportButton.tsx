"use client";

export default function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      id="report-coverage-button"
      onClick={onClick}
      aria-label="Report 5G coverage"
      className="flex items-center gap-1.5 sm:gap-2 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-full bg-gray-900 text-white text-[13px] sm:text-[15px] font-bold shadow-[0_12px_40px_rgba(0,0,0,0.2)] hover:scale-105 transition-all"
    >
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      <span className="hidden sm:inline font-semibold px-1">Report 5G Drop</span>
      <span className="sm:hidden font-semibold px-1">Report</span>
    </button>
  );
}
