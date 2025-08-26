import { apiRequest } from './api';

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  points: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number; // percent
  currentValue: number;
  targetValue: number;
  progressType: string;
}

export interface AchievementStatsSummary {
  total: number;
  unlocked: number;
  completionRate: number; // percent
  byCategory: Record<string, number>;
}

export interface AchievementListResponse {
  message: string;
  data: AchievementItem[];
  stats?: AchievementStatsSummary;
}

export interface AchievementQueryParams {
  category?: string;
  rarity?: string;
  unlocked?: boolean; // true = only unlocked, false = only locked, undefined = all
  search?: string;
  sort?: 'newest' | 'progress' | 'rarity' | 'title';
}

export async function fetchUserAchievements(params: AchievementQueryParams = {}): Promise<AchievementListResponse> {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.rarity) query.set('rarity', params.rarity);
  if (typeof params.unlocked === 'boolean') query.set('unlocked', String(params.unlocked));
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return apiRequest(`/achievements/user${qs ? `?${qs}` : ''}`);
}
