import type { User, Achievement } from '@/types/anturix';

import avatarCryptoAlpha from '@/assets/avatars/avatar-cryptoalpha.png';
import avatarBettingNewb from '@/assets/avatars/avatar-bettingnewb.png';
import avatarHoopGod from '@/assets/avatars/avatar-hoopgod.png';
import avatarSolanaShark from '@/assets/avatars/avatar-solanashark.png';
import avatarDegenKing from '@/assets/avatars/avatar-degenking.png';
import avatarWhaleWatch from '@/assets/avatars/avatar-whalewatch.png';
import avatarLuckyPunter from '@/assets/avatars/avatar-luckypunter.png';
import avatarAlphaHunter from '@/assets/avatars/avatar-alphahunter.png';
import avatarNoviceDave from '@/assets/avatars/avatar-novicedave.png';
import avatarMMAOracle from '@/assets/avatars/avatar-mmaoracle.png';

export const mockUsers: User[] = [
  { id: '1', username: 'CryptoAlpha_01', avatar: avatarCryptoAlpha, rank: 'Expert', wins: 145, losses: 7, winRate: 96, totalEarnings: 2340, reputationScore: 9800, activeDuels: 3, streak: 12, verified: true, joinDate: '2024-01-15' },
  { id: '2', username: 'BettingNewb_21', avatar: avatarBettingNewb, rank: 'Novice', wins: 7, losses: 22, winRate: 24, totalEarnings: 45, reputationScore: 320, activeDuels: 1, streak: 0, verified: false, joinDate: '2025-11-01', penaltyActive: true },
  { id: '3', username: 'HoopGod_77', avatar: avatarHoopGod, rank: 'Legend', wins: 312, losses: 8, winRate: 98, totalEarnings: 8900, reputationScore: 15000, activeDuels: 5, streak: 45, verified: true, joinDate: '2023-06-20' },
  { id: '4', username: 'SolanaShark', avatar: avatarSolanaShark, rank: 'Expert', wins: 189, losses: 23, winRate: 89, totalEarnings: 4560, reputationScore: 11200, activeDuels: 4, streak: 8, verified: true, joinDate: '2023-09-10' },
  { id: '5', username: 'DegenKing_99', avatar: avatarDegenKing, rank: 'Pro', wins: 87, losses: 41, winRate: 68, totalEarnings: 1230, reputationScore: 5600, activeDuels: 2, streak: 3, verified: true, joinDate: '2024-03-05' },
  { id: '6', username: 'WhaleWatch_X', avatar: avatarWhaleWatch, rank: 'Legend', wins: 276, losses: 12, winRate: 96, totalEarnings: 12400, reputationScore: 18000, activeDuels: 6, streak: 22, verified: true, joinDate: '2023-02-14' },
  { id: '7', username: 'LuckyPunter', avatar: avatarLuckyPunter, rank: 'Pro', wins: 65, losses: 35, winRate: 65, totalEarnings: 890, reputationScore: 4200, activeDuels: 1, streak: 5, verified: false, joinDate: '2024-07-22' },
  { id: '8', username: 'AlphaHunter_X', avatar: avatarAlphaHunter, rank: 'Expert', wins: 201, losses: 19, winRate: 91, totalEarnings: 5670, reputationScore: 12800, activeDuels: 3, streak: 15, verified: true, joinDate: '2023-08-01' },
  { id: '9', username: 'NoviceDave', avatar: avatarNoviceDave, rank: 'Novice', wins: 3, losses: 12, winRate: 20, totalEarnings: 15, reputationScore: 150, activeDuels: 0, streak: 0, verified: false, joinDate: '2026-01-10' },
  { id: '10', username: 'MMAOracle', avatar: avatarMMAOracle, rank: 'Expert', wins: 156, losses: 14, winRate: 92, totalEarnings: 3890, reputationScore: 10500, activeDuels: 2, streak: 9, verified: true, joinDate: '2024-02-28' },
];

export const currentUser: User = mockUsers[0];

export const mockAchievements: Achievement[] = [
  { id: 'a1', name: 'First Blood', description: 'Win your first duel', icon: '⚔️', earned: true },
  { id: 'a2', name: 'Shark', description: '10 consecutive wins', icon: '🦈', earned: true },
  { id: 'a3', name: 'Whale', description: 'Bet 100+ SOL in a single duel', icon: '🐋', earned: true },
  { id: 'a4', name: 'Oracle', description: '50 correct predictions', icon: '🔮', earned: true },
  { id: 'a5', name: 'Diamond Hands', description: 'Hold a losing position and win', icon: '💎', earned: false },
  { id: 'a6', name: 'Unbreakable', description: '20 win streak', icon: '🛡️', earned: false },
];

export const leaderboardUsers = [...mockUsers].sort((a, b) => b.totalEarnings - a.totalEarnings);
