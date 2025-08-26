export interface StudySession {
  _id: string;
  subject: string;
  duration: number; // minutes
  date: Date;
  quality: number; // 1-5
  technique: string;
  mood: string;
  efficiency: number; // percentage
  notes?: string;
  distractions: number;
}

export interface DayData {
  date: string;
  sessions: StudySession[];
  totalTime: number;
  averageQuality: number;
  averageEfficiency: number;
  sessionCount: number;
}

export type ViewMode = 'month' | 'year';

export interface ReminderItem {
  _id: string;
  text: string;
  subject?: string;
  isDone: boolean;
  date: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
