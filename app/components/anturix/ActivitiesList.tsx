"use client";

import React, { memo } from "react";
import { ANTURIX_ACTIVITIES } from "../../lib/hooks/use-anturix-web3";

interface ActivitiesListProps {
  activities: typeof ANTURIX_ACTIVITIES;
  isSending: boolean;
  profileData: any;
  onParticipate: (activity: typeof ANTURIX_ACTIVITIES[0]) => void;
}

export const ActivitiesList = memo(function ActivitiesList({ 
  activities, 
  isSending, 
  profileData, 
  onParticipate 
}: ActivitiesListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold tracking-tight">Ecosystem Activities</h3>
        {!profileData && (
          <span className="text-xs font-semibold text-destructive/80 uppercase tracking-wider">
            Profile Required to Stake
          </span>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {activities.map((act) => (
          <button
            key={act.id}
            disabled={isSending || !profileData}
            onClick={() => onParticipate(act)}
            className="group relative flex flex-col gap-5 rounded-2xl border border-border-low bg-card p-6 transition-all hover:border-primary/20 hover:shadow-xl disabled:opacity-40 disabled:hover:scale-100 disabled:hover:border-border-low disabled:cursor-not-allowed"
          >
            <div className={`h-2.5 w-14 rounded-full ${act.color} transition-transform group-hover:scale-x-110 origin-left`} />
            
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted/60">{act.type}</p>
              <h4 className="mt-1 font-bold text-lg leading-tight">{act.name}</h4>
              
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm font-bold text-primary">{act.stakeSol} SOL</span>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase tracking-tighter">
                  <span>+{act.xp} XP</span>
                </div>
              </div>
            </div>

            {/* Locked Overlay for UI clarity */}
            {!profileData && (
              <div className="absolute top-4 right-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-muted/40"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});
