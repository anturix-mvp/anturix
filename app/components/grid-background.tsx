"use client";

import React, { memo } from "react";

export const GridBackground = memo(function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Optimized ambient glow - single layer with dual stops */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(circle at 15% 50%, rgba(153,69,255,0.12) 0%, transparent 40%),
            radial-gradient(circle at 85% 50%, rgba(20,241,149,0.12) 0%, transparent 40%)
          `,
        }}
      />

      {/* Simplified single grid layer - CSS optimized */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(circle at center, black, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle at center, black, transparent 80%)",
        }}
      />
      
      {/* Bottom fog for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-100" />
    </div>
  );
});
