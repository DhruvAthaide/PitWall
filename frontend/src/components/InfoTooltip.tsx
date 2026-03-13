"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface InfoTooltipProps {
  text: string;
  children?: React.ReactNode;
}

export default function InfoTooltip({ text, children }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, above: true });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const above = rect.top > 120;
      setCoords({
        top: above ? rect.top - 6 : rect.bottom + 6,
        left: rect.left + rect.width / 2,
        above,
      });
    }
  }, [show]);

  const tooltip = show && mounted
    ? createPortal(
        <span
          className="fixed z-[9999] px-3 py-2 rounded-lg text-[11px] leading-relaxed font-normal whitespace-normal w-56 pointer-events-none"
          style={{
            background: "rgba(16, 16, 24, 0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
            color: "rgba(255,255,255,0.8)",
            top: coords.above ? undefined : coords.top,
            bottom: coords.above ? `calc(100vh - ${coords.top}px)` : undefined,
            left: coords.left,
            transform: "translateX(-50%)",
          }}
        >
          {text}
        </span>,
        document.body
      )
    : null;

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      {children || (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="ml-1 opacity-30 hover:opacity-60 transition-opacity cursor-help">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="bold">?</text>
        </svg>
      )}
      {tooltip}
    </span>
  );
}
