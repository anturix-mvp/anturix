const RECENT_DUEL_STORAGE_KEY = "anturix:recent-duel";

export interface RecentDuel {
  duelId: string;
  title?: string;
  description?: string;
  url: string;
  state?: "pending" | "active" | "resolved" | "claimed";
  updatedAt: number;
}


export function isPlayableRecentDuel(state?: RecentDuel["state"]) {
  return state === "pending" || state === "active";
}

export function getAppBaseUrl() {
  const configuredUrl = import.meta.env.VITE_APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "";
}

export function getDuelUrl(duelId: string) {
  const baseUrl = getAppBaseUrl();
  const path = `/duel/${duelId}`;

  if (!baseUrl) {
    return path;
  }

  return new URL(path, `${baseUrl}/`).toString();
}

export function storeRecentDuel(
  duelId: string,
  title?: string,
  state?: RecentDuel["state"],
  description?: string,
) {
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem(RECENT_DUEL_STORAGE_KEY);
  const duels: Record<string, RecentDuel> = raw ? JSON.parse(raw) : {};

  duels[duelId] = {
    duelId,
    title,
    description,
    url: getDuelUrl(duelId),
    state,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(RECENT_DUEL_STORAGE_KEY, JSON.stringify(duels));
}

export function loadRecentDuel(duelId?: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(RECENT_DUEL_STORAGE_KEY);
    if (!raw) return null;
    
    // Check if it's the old format (object) or new format (map)
    const data = JSON.parse(raw);
    if (data.duelId) {
      // Migrate old data
      if (duelId && data.duelId !== duelId) return null;
      return data as RecentDuel;
    }
    
    const duels: Record<string, RecentDuel> = data;

    if (duelId) {
      return duels[duelId] || null;
    }

    // If no duelId, return the most recent one
    const sorted = Object.values(duels).sort((a, b) => b.updatedAt - a.updatedAt);
    return sorted[0] || null;
  } catch {
    return null;
  }
}

