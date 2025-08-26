export interface PlanSubject {
  subject: string;
  targetQuestions: number;
  targetTime?: number;
  topics: string[];
  priority: number;
  completedQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  studyTime: number; // minutes
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  sessionIds: any[];
}

export interface PlanStats {
  totalTargetQuestions: number;
  totalCompletedQuestions: number;
  totalTargetTime: number;
  totalStudyTime: number; // minutes
  completionRate: number;
  netScore: number;
  successRate: number;
}

export interface StudyPlanLike {
  _id: string;
  date: string;
  title: string;
  subjects: PlanSubject[];
  stats: PlanStats;
}

export interface StudySessionLite {
  _id: string;
  subject: string;
  duration: number; // minutes
  date: Date;
  quality: number;
  technique: string;
  mood: string;
  efficiency: number;
  notes?: string;
  distractions: number;
  questionStats?: {
    targetQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    blankAnswers: number;
    netScore: number;
    completionRate: number;
  };
}

export interface AdvancedMetricsResult {
  efficiency: number;
  velocityScore: number;
  subjectDistribution: Record<string, any>;
  sessionsMetrics: {
    totalStudyTime: number;
    averageQuality: number;
    totalSessions: number;
    subjectDistribution: Record<string, any>;
  };
  consistencyScore: number;
  focusScore: number;
}