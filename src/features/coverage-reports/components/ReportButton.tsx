"use client";

export default function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      id="report-coverage-button"
      onClick={onClick}
      aria-label="Report 5G coverage"
      className="map-ui-enter map-pressable flex h-12 items-center gap-2 px-5 sm:px-6 rounded-full bg-[#1a73e8] text-white text-sm font-semibold shadow-[0_2px_8px_rgba(26,115,232,0.35)] hover:bg-[#1967d2] active:bg-[#185abc]"
    >
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      <span className="hidden sm:inline">Report coverage</span>
      <span className="sm:hidden">Report</span>
    </button>
  );
}
