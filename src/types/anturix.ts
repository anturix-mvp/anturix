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

export interface Duel {
  id: string;
  title: string;
  description: string;
  betAmount: number;
  creator: string; // Pubkey string
  opponent: string | null; // Pubkey string or null
  status: 'pending' | 'active' | 'resolved' | 'claimed';
  winner: string | null;
  createdAt: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}
