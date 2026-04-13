// Placeholder Solana service — mock implementations ready to be replaced with Anchor program calls

import type { Duel, Prediction, PokerPool } from '@/types/anturix';

export async function createDuel(params: {
  eventLabel: string;
  betAmount: number;
  opponentId?: string;
}): Promise<{ success: boolean; duelId: string; txSignature: string }> {
  await new Promise(r => setTimeout(r, 1000));
  return { success: true, duelId: `d-${Date.now()}`, txSignature: 'mock-sig-' + Date.now() };
}

export async function joinDuel(duelId: string, amount: number): Promise<{ success: boolean; txSignature: string }> {
  await new Promise(r => setTimeout(r, 1000));
  return { success: true, txSignature: 'mock-sig-' + Date.now() };
}

export async function unlockPrediction(predictionId: string, price: number): Promise<{ success: boolean; prediction: string }> {
  await new Promise(r => setTimeout(r, 1000));
  return { success: true, prediction: 'Unlocked analysis content here...' };
}

export async function joinPool(poolId: string, buyIn: number): Promise<{ success: boolean; txSignature: string }> {
  await new Promise(r => setTimeout(r, 1000));
  return { success: true, txSignature: 'mock-sig-' + Date.now() };
}

export async function getWalletBalance(publicKey: string): Promise<number> {
  return 42.5; // Mock balance
}
