import { apiRequest } from './api';

export interface HabitRoutineDto {
  _id: string;
  name: string;
  schedule: { timeStart: string; recurrence: string; daysOfWeek?: string[] };
  behavior?: { toleranceMinutes?: number };
  metrics?: { currentStreak?: number; longestStreak?: number; difficulty?: number };
  todayLog?: { _id: string; status: string; completedAt?: string; latenessMinutes?: number } | null;
  status?: string;
}

export interface HabitRiskItem { habitId: string; name: string; streak: number; riskScore: number; riskLevel: 'low'|'medium'|'high'; successRate7: number; successRate14?: number; }
export interface HabitHeatmapCell { key: string; planned: number; completed: number; successRate: number; missed: number; late: number; skipped: number; }
export interface HabitTrendPoint { date: string; planned: number; completed: number; successRate: number; }

export const getHabitRoutines = async (): Promise<{ message: string; data: HabitRoutineDto[] }> => {
  return apiRequest('/habits/routines');
};

export const createHabitRoutine = async (payload: Partial<HabitRoutineDto>) => {
  return apiRequest('/habits/routines', { method: 'POST', body: JSON.stringify(payload) });
};

export const updateHabitRoutine = async (id: string, payload: Partial<HabitRoutineDto>) => {
  return apiRequest(`/habits/routines/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
};

export const markHabit = async (id: string, action: 'done'|'skip') => {
  return apiRequest(`/habits/routines/${id}/logs`, { method: 'POST', body: JSON.stringify({ action }) });
};

export const deleteHabitRoutine = async (id: string) => apiRequest(`/habits/routines/${id}`, { method: 'DELETE' });

export const changeHabitStatus = async (id: string, status: 'active'|'paused'|'archived') => apiRequest(`/habits/routines/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const archiveHabitRoutine = async (id: string) => deleteHabitRoutine(id);

export const getHabitRisk = async (): Promise<{ message: string; data: HabitRiskItem[] }> => apiRequest('/habit-analytics/risk');

export const getHabitHeatmap = async (days = 30): Promise<{ message: string; data: { rangeDays: number; cells: HabitHeatmapCell[] } }> => apiRequest(`/habit-analytics/heatmap?days=${days}`);
export const getHabitTrends = async (days=30): Promise<{ message: string; data: { days: number; series: HabitTrendPoint[] } }> => apiRequest(`/habit-analytics/trends?days=${days}`);
