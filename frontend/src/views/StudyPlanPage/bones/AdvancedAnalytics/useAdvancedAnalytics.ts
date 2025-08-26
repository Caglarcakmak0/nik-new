import dayjs from 'dayjs';
import { AdvancedMetricsResult, StudyPlanLike, StudySessionLite } from './analyticsTypes';

export function extractSessionsFromPlan(plan: StudyPlanLike): StudySessionLite[] {
  try {
    const all: StudySessionLite[] = [] as any;
    (plan?.subjects || []).forEach(subj => {
      (subj.sessionIds || []).forEach((sess: any) => {
        if (sess && typeof sess === 'object' && (sess as any)._id) {
          all.push(sess as StudySessionLite);
        }
      });
    });
    const map = new Map<string, StudySessionLite>();
    all.forEach(s => {
      const id = (s as any)._id || (s as any).id;
      if (id && !map.has(id)) map.set(id, s);
    });
    return Array.from(map.values());
  } catch {
    return [];
  }
}

export function calculateAdvancedMetrics(plan: StudyPlanLike): AdvancedMetricsResult {
  const planEfficiency = plan.stats.totalStudyTime > 0
    ? (plan.stats.totalCompletedQuestions / (plan.stats.totalStudyTime / 60))
    : 0;
  const velocityScore = plan.stats.completionRate * (plan.stats.successRate / 100) * 10;
  const planSubjectDistribution = plan.subjects.reduce((acc, subject) => {
    const totalQuestions = subject.correctAnswers + subject.wrongAnswers + subject.blankAnswers;
    if (totalQuestions > 0) {
      acc[subject.subject] = {
        totalQuestions,
        accuracy: (subject.correctAnswers / totalQuestions) * 100,
        timeSpent: subject.studyTime,
        efficiency: totalQuestions / (subject.studyTime / 60) || 0
      };
    }
    return acc;
  }, {} as Record<string, any>);

  let sessionsMetrics = {
    totalStudyTime: 0,
    averageQuality: 0,
    totalSessions: 0,
    subjectDistribution: {} as Record<string, any>
  };

  const src = extractSessionsFromPlan(plan);
  if (src.length > 0) {
    const weekAgo = dayjs().subtract(7, 'day');
    const filteredSessions = src.filter(session => dayjs(session.date).isAfter(weekAgo));
    sessionsMetrics.totalSessions = filteredSessions.length;
    sessionsMetrics.totalStudyTime = filteredSessions.reduce((sum, s) => sum + s.duration, 0);
    sessionsMetrics.averageQuality = filteredSessions.length > 0
      ? filteredSessions.reduce((sum, s) => sum + s.quality, 0) / filteredSessions.length
      : 0;
    sessionsMetrics.subjectDistribution = filteredSessions.reduce((acc, session) => {
      if (!acc[session.subject]) {
        acc[session.subject] = {
          totalTime: 0,
          sessions: 0,
          averageQuality: 0,
          totalQuestions: 0,
          accuracy: 0
        };
      }
      acc[session.subject].totalTime += session.duration;
      acc[session.subject].sessions += 1;
      acc[session.subject].averageQuality += session.quality;
      if (session.questionStats) {
        const totalAttempted = session.questionStats.correctAnswers + session.questionStats.wrongAnswers + session.questionStats.blankAnswers;
        acc[session.subject].totalQuestions += totalAttempted;
        if (totalAttempted > 0) {
          acc[session.subject].accuracy = (session.questionStats.correctAnswers / totalAttempted) * 100;
        }
      }
      return acc;
    }, {} as Record<string, any>);
    Object.keys(sessionsMetrics.subjectDistribution).forEach(subject => {
      const data = sessionsMetrics.subjectDistribution[subject];
      data.averageQuality = data.averageQuality / data.sessions;
    });
  }

  return {
    efficiency: Math.round(planEfficiency * 100) / 100,
    velocityScore: Math.round(velocityScore * 100) / 100,
    subjectDistribution: planSubjectDistribution,
    sessionsMetrics,
    consistencyScore: plan.stats.completionRate,
    focusScore: plan.stats.totalStudyTime > 0 ? Math.min(100, (plan.stats.totalCompletedQuestions / plan.stats.totalTargetQuestions) * 100) : 0
  };
}

export function minutesToDisplay(minutes: number): string {
  if (!minutes || minutes <= 0) return '0dk';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}s ${m}d` : `${m}d`;
}

export type AnalyticsTimeframe = 'daily' | 'weekly' | 'monthly';

export function timeframeToDays(tf: AnalyticsTimeframe): number {
  switch (tf) {
    case 'monthly': return 30;
    case 'weekly': return 7;
    case 'daily':
    default: return 7;
  }
}