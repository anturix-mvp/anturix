"use client";

import React, { memo } from "react";

interface ProfileSetupProps {
  initProfile: () => void;
  isSending: boolean;
}

export const ProfileSetup = memo(function ProfileSetup({ initProfile, isSending }: ProfileSetupProps) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center ring-1 ring-primary/10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-primary"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight">Set Up Your Anturix Identity</h3>
      <p className="mt-2 text-sm text-muted max-w-md mx-auto">
        You need to initialize your on-chain profile to participate in real duels and track your progress across the ecosystem.
      </p>
      <button
        onClick={initProfile}
        disabled={isSending}
        className="mt-8 rounded-xl bg-primary px-10 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
      >
        {isSending ? "Initializing Account..." : "Create On-chain Profile"}
      </button>
    </section>
  );
});
