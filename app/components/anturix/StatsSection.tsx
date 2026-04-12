"use client";

import React, { memo } from "react";

interface StatsSectionProps {
  localLevel: number;
  localXp: number;
  duelsWon: number;
  txStatus: string | null;
  profileData: any;
}

export const StatsSection = memo(function StatsSection({ 
  localLevel, 
  localXp, 
  duelsWon, 
  txStatus, 
  profileData 
}: StatsSectionProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="rounded-2xl border border-border-low bg-card p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Expert Level</p>
        <p className="mt-2 text-3xl font-black">{localLevel}</p>
        <p className="text-sm text-muted">Total XP: {localXp}</p>
      </div>
      
      <div className="rounded-2xl border border-border-low bg-card p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Duels Won</p>
        <p className="mt-2 text-3xl font-black text-primary">{duelsWon}</p>
        <p className="text-sm text-muted">
          {profileData ? "On-chain Synced" : "Local Session Only"}
        </p>
      </div>

      <div className="rounded-2xl border border-border-low bg-card p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Transaction Status</p>
        <p className="mt-2 text-sm font-medium truncate">
          {txStatus || "Waiting for user action"}
        </p>
      </div>
    </div>
  );
});
