export type RankTier = 'Novice' | 'Pro' | 'Expert' | 'Legend';

export interface User {
  id: string;
  username: string;
  avatar: string;
  rank: RankTier;
  wins: number;
  losses: number;
  winRate: number;
  totalEarnings: number;
  reputationScore: number;
  activeDuels: number;
  streak: number;
  verified: boolean;
  joinDate: string;
  penaltyActive?: boolean;
}

export type CryptoCondition = 'above' | 'below' | 'even' | 'odd' | 'first_to' | 'one_touch';
export type CryptoAsset = 'SOL' | 'BTC' | 'ETH';

export interface DuelCryptoInfo {
  asset: CryptoAsset;
  condition: CryptoCondition;
  targetPrice?: number;
  assetB?: CryptoAsset;
  targetPriceB?: number;
  expiresLabel?: string; // e.g. "4:00 PM"
}

export interface Duel {
  id: string;
  title: string;
  eventLabel: string;
  betAmount: number;
  challenger: User;
  opponent: User;
  status: 'active' | 'pending' | 'completed';
  communityBacking: { challenger: number; opponent: number };
  percentage: { challenger: number; opponent: number };
  totalPool: number;
  createdAt: string;
  crypto?: DuelCryptoInfo;
}

export interface Prediction {
  id: string;
  expert: User;
  eventLabel: string;
  odds: string;
  unlockPrice: number;
  sport: string;
  hotStreak?: boolean;
  description: string;
  pastPerfect: number;
}

export interface PokerPool {
  id: string;
  title: string;
  seats: { occupied: number; total: number };
  buyIn: number;
  participants: User[];
  status: 'open' | 'full' | 'in_progress';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export type FeedItem =
  | { type: 'duel'; data: Duel }
  | { type: 'prediction'; data: Prediction }
  | { type: 'pool'; data: PokerPool };
