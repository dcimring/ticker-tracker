export type AssetType = 'stock' | 'crypto';
export type AlertStatus = 'active' | 'triggered' | 'archived';

export interface WatchlistItem {
  id: string;
  ticker: string;
  assetType: AssetType;
  targetPrice: number;
  takeProfitLevels?: number[];
  currentPrice?: number;
  reasoning?: string;
  status: AlertStatus;
  userId: string;
  createdAt: any; // Firestore Timestamp
}

export interface UserConfig {
  userId: string;
  discordWebhookUrl?: string;
  alertThreshold?: number; // e.g., 0.02 for 2%
  liveSyncEnabled?: boolean;
}

export interface ParsedTrade {
  ticker: string;
  assetType: AssetType;
  targetPrice: number;
  takeProfitLevels?: number[];
  reasoning?: string;
}
