import type { User, Duel, Prediction, PokerPool, FeedItem, Achievement } from '@/types/anturix';

const avatar = (seed: string) => `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}&backgroundColor=0a0e1a,1a1a2e,2d1b69,0d2137`;

export const mockUsers: User[] = [
  { id: '1', username: 'CryptoAlpha_01', avatar: avatar('CryptoAlpha'), rank: 'Expert', wins: 145, losses: 7, winRate: 96, totalEarnings: 2340, reputationScore: 9800, activeDuels: 3, streak: 12, verified: true, joinDate: '2024-01-15' },
  { id: '2', username: 'BettingNewb_21', avatar: avatar('BettingNewb'), rank: 'Novice', wins: 7, losses: 22, winRate: 24, totalEarnings: 45, reputationScore: 320, activeDuels: 1, streak: 0, verified: false, joinDate: '2025-11-01', penaltyActive: true },
  { id: '3', username: 'HoopGod_77', avatar: avatar('HoopGod'), rank: 'Legend', wins: 312, losses: 8, winRate: 98, totalEarnings: 8900, reputationScore: 15000, activeDuels: 5, streak: 45, verified: true, joinDate: '2023-06-20' },
  { id: '4', username: 'SolanaShark', avatar: avatar('SolanaShark'), rank: 'Expert', wins: 189, losses: 23, winRate: 89, totalEarnings: 4560, reputationScore: 11200, activeDuels: 4, streak: 8, verified: true, joinDate: '2023-09-10' },
  { id: '5', username: 'DegenKing_99', avatar: avatar('DegenKing'), rank: 'Pro', wins: 87, losses: 41, winRate: 68, totalEarnings: 1230, reputationScore: 5600, activeDuels: 2, streak: 3, verified: true, joinDate: '2024-03-05' },
  { id: '6', username: 'WhaleWatch_X', avatar: avatar('WhaleWatch'), rank: 'Legend', wins: 276, losses: 12, winRate: 96, totalEarnings: 12400, reputationScore: 18000, activeDuels: 6, streak: 22, verified: true, joinDate: '2023-02-14' },
  { id: '7', username: 'LuckyPunter', avatar: avatar('LuckyPunter'), rank: 'Pro', wins: 65, losses: 35, winRate: 65, totalEarnings: 890, reputationScore: 4200, activeDuels: 1, streak: 5, verified: false, joinDate: '2024-07-22' },
  { id: '8', username: 'AlphaHunter_X', avatar: avatar('AlphaHunter'), rank: 'Expert', wins: 201, losses: 19, winRate: 91, totalEarnings: 5670, reputationScore: 12800, activeDuels: 3, streak: 15, verified: true, joinDate: '2023-08-01' },
  { id: '9', username: 'NoviceDave', avatar: avatar('NoviceDave'), rank: 'Novice', wins: 3, losses: 12, winRate: 20, totalEarnings: 15, reputationScore: 150, activeDuels: 0, streak: 0, verified: false, joinDate: '2026-01-10' },
  { id: '10', username: 'MMAOracle', avatar: avatar('MMAOracle'), rank: 'Expert', wins: 156, losses: 14, winRate: 92, totalEarnings: 3890, reputationScore: 10500, activeDuels: 2, streak: 9, verified: true, joinDate: '2024-02-28' },
];

export const currentUser: User = mockUsers[0];

export const mockDuels: Duel[] = [
  {
    id: 'd1', title: 'Smart-Banter Duelo', eventLabel: 'CHAMPIONS LEAGUE: REAL MADRID (RM) VS. FC BARCELONA (FC B)',
    betAmount: 10, challenger: mockUsers[0], opponent: mockUsers[1], status: 'active',
    communityBacking: { challenger: 238, opponent: 127 }, percentage: { challenger: 65, opponent: 35 },
    totalPool: 25.5, createdAt: '2026-04-12T18:00:00Z',
  },
  {
    id: 'd2', title: 'Smart-Banter Duelo', eventLabel: 'UFC 310: ADESANYA VS. PEREIRA III',
    betAmount: 25, challenger: mockUsers[4], opponent: mockUsers[9], status: 'active',
    communityBacking: { challenger: 412, opponent: 389 }, percentage: { challenger: 52, opponent: 48 },
    totalPool: 68.2, createdAt: '2026-04-11T20:00:00Z',
  },
  {
    id: 'd3', title: 'Smart-Banter Duelo', eventLabel: 'PREMIER LEAGUE: ARSENAL VS. MAN CITY',
    betAmount: 5, challenger: mockUsers[7], opponent: mockUsers[6], status: 'active',
    communityBacking: { challenger: 156, opponent: 201 }, percentage: { challenger: 44, opponent: 56 },
    totalPool: 15.8, createdAt: '2026-04-13T10:00:00Z',
  },
];

export const mockPredictions: Prediction[] = [
  { id: 'p1', expert: mockUsers[2], eventLabel: 'NBA PARLAY: LAKERS + CELTICS + NUGGETS WINS', odds: 'Lakers -150 | Celtics +120 | Nuggets +110', unlockPrice: 0.5, sport: 'NBA', hotStreak: true, description: 'Triple lock parlay with detailed analysis.', pastPerfect: 45 },
  { id: 'p2', expert: mockUsers[3], eventLabel: 'EPL: LIVERPOOL VS CHELSEA — EXACT SCORE', odds: 'Liverpool 2-1 @ +350', unlockPrice: 0.3, sport: 'Soccer', description: 'Based on historical H2H data.', pastPerfect: 32 },
  { id: 'p3', expert: mockUsers[5], eventLabel: 'NFL WEEK 14: CHIEFS SPREAD ANALYSIS', odds: 'Chiefs -7.5 @ -110', unlockPrice: 1.0, sport: 'NFL', hotStreak: true, description: 'Deep dive into Chiefs defense matchup.', pastPerfect: 61 },
  { id: 'p4', expert: mockUsers[7], eventLabel: 'CRYPTO: BTC PRICE EOD PREDICTION', odds: 'BTC > $95K @ +200', unlockPrice: 0.8, sport: 'Crypto', description: 'On-chain analysis and whale tracking.', pastPerfect: 28 },
  { id: 'p5', expert: mockUsers[9], eventLabel: 'MMA: FIGHT NIGHT MAIN EVENT WINNER', odds: 'Fighter A by KO Rd 2 @ +450', unlockPrice: 0.4, sport: 'MMA', description: 'Striking stats breakdown.', pastPerfect: 19 },
];

export const mockPools: PokerPool[] = [
  { id: 'pp1', title: 'High Stakes Omaha', seats: { occupied: 4, total: 6 }, buyIn: 20, participants: mockUsers.slice(0, 4), status: 'open' },
  { id: 'pp2', title: 'Degen Express', seats: { occupied: 7, total: 8 }, buyIn: 5, participants: mockUsers.slice(2, 9), status: 'open' },
  { id: 'pp3', title: 'Whale Room', seats: { occupied: 2, total: 4 }, buyIn: 100, participants: mockUsers.slice(5, 7), status: 'open' },
];

export const mockFeed: FeedItem[] = [
  { type: 'duel', data: mockDuels[0] },
  { type: 'prediction', data: mockPredictions[0] },
  { type: 'duel', data: mockDuels[1] },
  { type: 'pool', data: mockPools[0] },
  { type: 'prediction', data: mockPredictions[1] },
  { type: 'pool', data: mockPools[1] },
  { type: 'duel', data: mockDuels[2] },
  { type: 'prediction', data: mockPredictions[2] },
];

export const mockAchievements: Achievement[] = [
  { id: 'a1', name: 'First Blood', description: 'Win your first duel', icon: '⚔️', earned: true },
  { id: 'a2', name: 'Shark', description: '10 consecutive wins', icon: '🦈', earned: true },
  { id: 'a3', name: 'Whale', description: 'Bet 100+ SOL in a single duel', icon: '🐋', earned: true },
  { id: 'a4', name: 'Oracle', description: '50 correct predictions', icon: '🔮', earned: true },
  { id: 'a5', name: 'Diamond Hands', description: 'Hold a losing position and win', icon: '💎', earned: false },
  { id: 'a6', name: 'Unbreakable', description: '20 win streak', icon: '🛡️', earned: false },
];

export const leaderboardUsers = [...mockUsers].sort((a, b) => b.totalEarnings - a.totalEarnings);
