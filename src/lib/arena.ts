const RECENT_DUEL_STORAGE_KEY = "anturix:recent-duel";

export interface RecentDuel {
  duelId: string;
  title?: string;
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
) {
  if (typeof window === "undefined") return;

  const recentDuel: RecentDuel = {
    duelId,
    title,
    url: getDuelUrl(duelId),
    state,
    updatedAt: Date.now(),
  };

  window.localStorage.setItem(
    RECENT_DUEL_STORAGE_KEY,
    JSON.stringify(recentDuel),
  );
}

export function loadRecentDuel(duelId?: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(RECENT_DUEL_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as RecentDuel;
    if (duelId && data.duelId !== duelId) return null;
    return data;
  } catch {
    return null;
  }
}
