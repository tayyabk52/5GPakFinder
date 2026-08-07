"use client";

import { useState } from "react";

interface InfoTooltipProps {
  label: string;
  text: string;
}

export default function InfoTooltip({ label, text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Help: ${label}`}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold hover:bg-gray-300"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 z-50 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 shadow-xl leading-relaxed"
        >
          {text}
        </span>
      )}
    </span>
  );
}
