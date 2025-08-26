const isDev = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);
export const API_BASE_URL = isDev
  ? '/api'
  : ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
     (typeof process !== 'undefined' && (process as any).env?.VITE_API_BASE_URL) ||
     'https://caglar.harunbulbul.com/api');
export const API_HOST = API_BASE_URL.replace(/\/?api\/?$/, '');

export const toAbsoluteUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${API_HOST}${path}`;
  return path;
};

// Token expire callback fonksiyonu - dışarıdan set edilecek
let onTokenExpire: (() => void) | null = null;

/** 
 * Token expire callback'ini ayarla
 * AuthContext bu fonksiyonu kullanarak logout işlemini tetikleyebilir
 */
export const setTokenExpireCallback = (callback: () => void) => {
  onTokenExpire = callback;
};

/**
 * API request fonksiyonu - otomatik token ekleme ve expire kontrolü ile
 */
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  // LocalStorage'dan token al
  const token = localStorage.getItem('token');

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      // Eğer token varsa Authorization header'ına ekle
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    // Başarısız HTTP yanıtları: gövdeyi sadece bir kez oku ve kullanıcı dostu mesaj üret
    if (!response.ok) {
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        try {
          const text = await response.text();
          data = { message: (text || '').trim() };
        } catch {
          data = {};
        }
      }

      const status = response.status;
      const backendMessage: string | undefined = data?.message || data?.error || data?.msg;

      // 401/403 için token süresi doldu mu kontrolü (body tek sefer okundu)
      if (status === 401 || status === 403) {
        const expireMessages = [
          'Token sürümü eski',
          'Oturum süreniz doldu',
          'Token doğrulama hatası',
          'jwt expired',
          'refresh token',
        ];
        const isTokenExpired = !!backendMessage && expireMessages.some((m) => backendMessage.toLowerCase().includes(m.toLowerCase()));
        if (isTokenExpired && onTokenExpire) {
          onTokenExpire();
          throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        }
      }

      // Validation hataları
      const validationErrors: string[] | undefined = Array.isArray(data?.errors) ? data.errors : undefined;

      // Duruma göre kullanıcı dostu mesaj oluştur
      const friendly = (() => {
        if (backendMessage) {
          // Bazı yaygın backend mesajlarını Türkçeleştir veya doğrudan göster
          return backendMessage;
        }
        switch (status) {
          case 400:
            return validationErrors?.length ? `Doğrulama hatası: ${validationErrors.join(', ')}` : 'Geçersiz istek.';
          case 401:
            return 'Yetkisiz işlem. Lütfen giriş yapın.';
          case 403:
            return 'Bu işlem için yetkiniz yok.';
          case 404:
            return 'Kayıt bulunamadı.';
          case 409:
            return 'Çakışma oluştu. Lütfen bilgileri kontrol edin.';
          case 422:
            return validationErrors?.length ? `Doğrulama hatası: ${validationErrors.join(', ')}` : 'Doğrulama hatası.';
          case 429:
            return 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.';
          default:
            return 'Sunucuda bir hata oluştu. Lütfen tekrar deneyin.';
        }
      })();

      throw new Error(friendly);
    }

    return response.json();
  } catch (error) {
    // Network hataları için
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.');
    }
    
    // Diğer hataları aynen fırlat
    throw error;
  }
};

// ==== Student - Coach Secret Feedback APIs ====
export type CoachFeedbackCategories = {
  communication: number;
  programQuality: number;
  overallSatisfaction: number;
};

export type CoachFeedbackSpecificIssues = {
  tooMuchPressure?: boolean;
  notEnoughSupport?: boolean;
  communicationProblems?: boolean;
  programNotSuitable?: boolean;
  other?: string;
};

export const getMyCoach = async () => {
  return apiRequest('/student/my-coach');
};

export const getCoachFeedbackStatus = async () => {
  return apiRequest('/student/feedback/coach/status');
};

export const submitCoachFeedback = async (payload: {
  coachId: string;
  categories: CoachFeedbackCategories;
  feedback: string;
  specificIssues?: CoachFeedbackSpecificIssues;
}) => {
  return apiRequest('/student/feedback/coach', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

// ==== Admin - Feedback Management ====
export type AdminFeedbackListItem = {
  id: string;
  coach: { id: string; name: string };
  student: { id: string; name: string };
  overallRating: number;
  status: 'new' | 'read';
  createdAt: string;
};

export const getAdminFeedbacks = async (params: { status?: 'new' | 'read'; limit?: number; offset?: number } = {}) => {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  return apiRequest(`/admin/feedbacks${qs ? `?${qs}` : ''}`);
};

export const getAdminFeedbackDetail = async (id: string) => {
  return apiRequest(`/admin/feedbacks/${id}`);
};

export const markAdminFeedbackRead = async (id: string) => {
  return apiRequest(`/admin/feedbacks/${id}/read`, { method: 'PUT' });
};

// ==== Admin - Coach Management ====
export type AdminCoachListItem = {
  _id: string;
  name: string;
  email: string;
  city?: string;
  avatar?: string | null;
  createdAt: string;
};

export const getAdminCoaches = async (params: { q?: string; page?: number; limit?: number } = {}) => {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  return apiRequest(`/admin/coaches${qs ? `?${qs}` : ''}`);
};

export type AdminCoachStudentItem = {
  _id: string;
  name: string;
  email: string;
  grade?: string;
  city?: string;
};

export const getAdminCoachStudents = async (
  coachId: string,
  params: { status?: 'active' | 'inactive'; page?: number; limit?: number } = {}
) => {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  return apiRequest(`/admin/coaches/${coachId}/students${qs ? `?${qs}` : ''}`);
};

export const getAdminCoachPerformance = async (coachId: string) => {
  return apiRequest(`/admin/coaches/${coachId}/performance`);
};

export const assignCoach = async (payload: { coachId: string; studentIds: string[] }) => {
  return apiRequest('/admin/assign-coach', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const reassignStudent = async (payload: {
  studentId: string;
  fromCoachId: string;
  toCoachId: string;
  reason?: string;
}) => {
  return apiRequest('/admin/reassign-student', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

// ==== Admin - Statistics ====
export type FeedbackSummary = {
  totalFeedbacks: number;
  averageRating: number;
  categoryAverages: {
    communication: number;
    programQuality: number;
    overallSatisfaction: number;
  };
  issuesCounts: {
    tooMuchPressure: number;
    notEnoughSupport: number;
    communicationProblems: number;
    programNotSuitable: number;
  };
  lastFeedbackDate: string | null;
  statusCounts: { new: number; read: number };
};

export const getAdminCoachesStatistics = async () => {
  return apiRequest('/admin/statistics/coaches');
};

export const getAdminFeedbackSummary = async (): Promise<{ message: string; data: FeedbackSummary }> => {
  return apiRequest('/admin/statistics/feedback-summary');
};

// System metrics
export type AdminSystemMetrics = {
  totalUsers: number;
  totalStudents: number;
  totalCoaches: number;
  totalSessions: number;
  activeUsers: number;
  avgSessionTime: number;
  totalQuestions: number;
  systemLoad: number;
  responseTime: number;
  responseTimeP95: number;
  uptimeSeconds: number;
  sampleCount: number;
  memory?: { rssMB: number; heapUsedMB: number; heapTotalMB: number };
};

export const getAdminSystemMetrics = async (): Promise<{ message: string; data: AdminSystemMetrics }> => {
  return apiRequest('/admin/system/metrics');
};

export type AdminUserGrowth = { month: string; totalUsers: number; baselineUsers: number; growthPercent: number };
export const getAdminUserGrowth = async (): Promise<{ message: string; data: AdminUserGrowth }> => {
  return apiRequest('/admin/system/user-growth');
};

// ==== Admin - Users ====
export type AdminUserListItem = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'coach' | 'admin';
  profileCompleteness: number;
  lastActivity: string;
  status: 'active' | 'inactive';
  registrationDate: string;
};

export const getAdminUsers = async (params: { q?: string; role?: 'student' | 'coach' | 'admin'; page?: number; limit?: number } = {}) => {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.role) search.set('role', params.role);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`);
};

export const updateUser = async (id: string, payload: Partial<{ firstName: string; lastName: string; email: string; role: 'student' | 'coach' | 'admin'; isActive: boolean }>) => {
  return apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const deleteUser = async (id: string) => {
  return apiRequest(`/users/${id}`, { method: 'DELETE' });
};

export const getUserDetail = async (id: string) => {
  return apiRequest(`/users/${id}`);
};

export const createUser = async (payload: {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  role?: 'student' | 'coach' | 'admin';
}) => {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

// ==== Admin - Users (basic list for assignment) - legacy ====
export const getAllUsers = async () => {
  return apiRequest('/users');
};

// ==== Student - Programs (Daily Plans) ====
export type StudentProgramSubject = {
  subject: string;
  description?: string;
  targetTime?: number;
  targetQuestions?: number;
  priority?: number;
  notes?: string;
  completedQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  blankAnswers?: number;
  studyTime?: number;
  status?: string;
  topics?: string[];
};

export type StudentProgram = {
  _id: string;
  title?: string;
  date: string;
  status: 'draft' | 'active' | 'completed' | 'failed' | 'archived';
  subjects: StudentProgramSubject[];

  motivationNote?: string;
  stats?: {
    completionRate?: number;
    totalStudyTime?: number;
    totalTargetTime?: number;
    totalCompletedQuestions?: number;
    totalTargetQuestions?: number;
    netScore?: number;
  };
};

export const getStudentPrograms = async (params: {
  status?: 'draft' | 'active' | 'completed' | 'failed' | 'archived';
  from?: string; // ISO
  to?: string;   // ISO
  page?: number;
  limit?: number;
} = {}) => {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  return apiRequest(`/student/programs${qs ? `?${qs}` : ''}`);
};

export const getStudentProgramDetail = async (id: string) => {
  return apiRequest(`/student/programs/${id}`);
};

export const updateLiveTracking = async (planId: string, data: {
  subjectIndex?: number;
  isActive?: boolean;
  currentInterval?: string;
  studyTime?: number;
  questionsAnswered?: {
    correct: number;
    wrong: number;
    blank: number;
  };
}) => {
  return apiRequest(`/daily-plans/${planId}/live-tracking`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const getCoachLiveDashboard = async (range?: string) => {
  const qs = range ? `?range=${range}` : '';
  return apiRequest(`/daily-plans/coach/live-dashboard${qs}`);
};

export const getCoachStudentReports = async (params: {
  studentId?: string;
  date?: string;
  limit?: number;
  offset?: number;
} = {}) => {
  const search = new URLSearchParams();
  if (params.studentId) search.set('studentId', params.studentId);
  if (params.date) search.set('date', params.date);
  if (params.limit) search.set('limit', params.limit.toString());
  if (params.offset) search.set('offset', params.offset.toString());
  
  return apiRequest(`/daily-plans/coach/student-reports?${search.toString()}`);
};

export const createStudySession = async (sessionData: {
  subject: string;
  duration: number;
  date?: Date;
  notes?: string;
  quality: number;
  technique: string;
  mood?: string;
  distractions?: number;
  dailyPlanId?: string;
  questionStats?: any;
}) => {
  return apiRequest('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
};

// ==== Student - Practice Exams (Denemeler) ====
export type PracticeExamSection = {
  name: string;
  totalQuestions?: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  wrongTopics?: string[];
  net?: number;
};

export type PracticeExam = {
  _id: string;
  userId: string;
  date: string;
  category: 'TYT_GENEL' | 'AYT_GENEL' | 'BRANS';
  branchSubject?: string;
  title?: string;
  examDuration?: number;
  notes?: string;
  sections: PracticeExamSection[];
  totals: {
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    blankAnswers: number;
    net: number;
  };
};

export const getStudentExams = async (params: {
  from?: string;
  to?: string;
  category?: 'TYT_GENEL' | 'AYT_GENEL' | 'BRANS';
  page?: number;
  limit?: number;
} = {}) => {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.category) search.set('category', params.category);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  return apiRequest(`/student/exams${qs ? `?${qs}` : ''}`);
};

export const createStudentExam = async (payload: {
  date: string;
  category: 'TYT_GENEL' | 'AYT_GENEL' | 'BRANS';
  branchSubject?: string;
  title?: string;
  examDuration?: number;
  notes?: string;
  sections: PracticeExamSection[];
}) => {
  return apiRequest('/student/exams', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateStudentExam = async (id: string, payload: Partial<{
  date: string;
  category: 'TYT_GENEL' | 'AYT_GENEL' | 'BRANS';
  branchSubject?: string;
  title?: string;
  examDuration?: number;
  notes?: string;
  sections: PracticeExamSection[];
}>) => {
  return apiRequest(`/student/exams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

// ==== Reminders (Calendar Notes) ====
export interface ReminderItem {
  _id: string;
  date: string; // ISO
  text: string;
  subject?: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getReminders = async (params: { from?: string; to?: string } = {}) => {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const qs = search.toString();
  return apiRequest(`/reminders${qs ? `?${qs}` : ''}`);
};

export const createReminder = async (payload: { date: string; text: string; subject?: string }) => {
  return apiRequest('/reminders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateReminder = async (id: string, payload: Partial<{ date: string; text: string; subject?: string; isDone: boolean }>) => {
  return apiRequest(`/reminders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const deleteReminder = async (id: string) => {
  return apiRequest(`/reminders/${id}`, { method: 'DELETE' });
};

export const deleteStudentExam = async (id: string) => {
  return apiRequest(`/student/exams/${id}`, { method: 'DELETE' });
};

// ==== Admin - Student Programs (Daily Plans by user) ====
export const getAdminStudentPrograms = async (
  studentId: string,
  params: {
    status?: 'draft' | 'active' | 'completed' | 'failed' | 'archived';
    from?: string;
    to?: string;
    source?: 'self' | 'coach' | 'template' | 'ai_generated';
    page?: number;
    limit?: number;
  } = {}
) => {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.source) search.set('source', params.source);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  return apiRequest(`/admin/students/${studentId}/programs${qs ? `?${qs}` : ''}`);
};

// ==== Motivation (Public & Admin) ====
export type Motivation = {
  text: string;
  author?: string | null;
  year?: number;
  weekOfYear?: number;
  updatedAt?: string;
};

export const getCurrentMotivation = async (): Promise<{ message: string; data: Motivation }> => {
  return apiRequest('/motivation/current');
};

export const getAdminMotivation = async (params: { year?: number; week?: number } = {}) => {
  const search = new URLSearchParams();
  if (params.year !== undefined) search.set('year', String(params.year));
  if (params.week !== undefined) search.set('week', String(params.week));
  const qs = search.toString();
  return apiRequest(`/admin/motivation${qs ? `?${qs}` : ''}`);
};

export const updateAdminMotivation = async (payload: { text: string; author?: string; year?: number; week?: number }) => {
  return apiRequest('/admin/motivation', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

// ==== Backup (basic) ====
export const createBackup = async (payload: { type?: 'manual' | 'auto'; dataTypes?: string[] } = { type: 'manual' }) => {
  return apiRequest('/backup/create', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

// ==== Onboarding / Tutorial ====
export const markTutorialSeen = async () => {
  return apiRequest('/users/tutorial/seen', { method: 'POST' });
};

// ==== Study Room & Duels ====
export type StudyRoomActivityItem = {
  userId: string;
  name: string;
  avatar?: string | null;
  totalTime: number; // minutes
  sessions: number;
  lastActivity: string;
};

export const getStudyRoomActivity = async (period: 'daily' | 'weekly' = 'daily'): Promise<{ message: string; data: StudyRoomActivityItem[] }> => {
  return apiRequest(`/duels/room/activity?period=${period}`);
};

export type Duel = {
  _id: string;
  challenger: { _id: string; name: string; email: string; avatar?: string | null } | string;
  opponent: { _id: string; name: string; email: string; avatar?: string | null } | string;
  period: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'declined' | 'cancelled' | 'completed';
  results?: {
    challengerStudyTimeMin: number;
    opponentStudyTimeMin: number;
    winnerUserId?: string | null;
    completedAt?: string;
  };
  liveScores?: { challengerStudyTimeMin: number; opponentStudyTimeMin: number };
};

export const getActiveDuels = async (): Promise<{ message: string; data: Duel[] }> => {
  return apiRequest('/duels/active');
};

export const getDuels = async (): Promise<{ message: string; data: Duel[] }> => {
  return apiRequest('/duels');
};

export const inviteDuel = async (opponentId: string, period: 'daily' | 'weekly') => {
  return apiRequest('/duels/invite', {
    method: 'POST',
    body: JSON.stringify({ opponentId, period })
  });
};

export const respondDuel = async (id: string, accept: boolean) => {
  return apiRequest(`/duels/${id}/respond`, {
    method: 'POST',
    body: JSON.stringify({ accept })
  });
};

export const completeDuel = async (id: string) => {
  return apiRequest(`/duels/${id}/complete`, { method: 'POST' });
};

// ==== Leaderboard - User Stats (for dashboard) ====
export type LeaderboardUserStats = {
  _id: string;
  name: string;
  totalScore: number;
  totalQuestions: number;
  totalStudyTime: number;
  streak: number;
  level: number;
  experience: number;
  achievements: Array<{ id: string; title: string; description?: string; icon?: string; rarity?: string; unlockedAt?: string; points?: number }>;
  weeklyScore: number;
  monthlyScore: number;
  rank: number;
  weeklyRank: number;
  monthlyRank: number;
};

export const getLeaderboardUserStats = async (): Promise<{ message: string; data: LeaderboardUserStats }> => {
  return apiRequest('/leaderboard/user-stats');
};

// ==== In-App Notifications ====
export type AppNotification = {
  _id: string;
  category: 'performance' | 'coach' | 'gamification' | 'system';
  type: string;
  title: string;
  body?: string;
  actionUrl?: string;
  importance?: 'low' | 'normal' | 'high';
  icon?: string;
  readAt?: string | null;
  createdAt: string;
  meta?: any;
};

export const getNotifications = async (params: { unreadOnly?: boolean; limit?: number; cursor?: string } = {}): Promise<{ message: string; data: AppNotification[]; paging: { hasMore: boolean; nextCursor?: string | null } }> => {
  const search = new URLSearchParams();
  if (params.unreadOnly !== undefined) search.set('unreadOnly', String(params.unreadOnly));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.cursor) search.set('cursor', params.cursor);
  const qs = search.toString();
  return apiRequest(`/notifications${qs ? `?${qs}` : ''}`);
};

export const markNotificationRead = async (id: string) => {
  return apiRequest(`/notifications/${id}/read`, { method: 'POST' });
};

export const markAllNotificationsRead = async () => {
  return apiRequest(`/notifications/read-all`, { method: 'POST' });
};

export const getAdminUserPlan = async (id: string) => {
  return apiRequest(`/admin/users/${id}/plan`);
};

export const updateAdminUserPlan = async (id: string, payload: { tier?: 'free'|'premium'; status?: 'active'|'expired'|'cancelled'; expiresAt?: string; resetLimits?: boolean }) => {
  return apiRequest(`/admin/users/${id}/plan`, { method: 'PUT', body: JSON.stringify(payload) });
};

export const updateAdminUserLimits = async (id: string, payload: Partial<{ activePlansMax: number; studySessionsPerDay: number; examsPerMonth: number }>) => {
  return apiRequest(`/admin/users/${id}/limits`, { method: 'PUT', body: JSON.stringify(payload) });
};

export const updateAdminUserEntitlements = async (id: string, entitlements: string[]) => {
  return apiRequest(`/admin/users/${id}/entitlements`, { method: 'PUT', body: JSON.stringify({ entitlements }) });
};

// ==== YouTube (proxy) ====
export const getYouTubePlaylistItems = async (playlistId: string, params: { pageToken?: string; maxResults?: number } = {}) => {
  const search = new URLSearchParams();
  if (params.pageToken) search.set('pageToken', params.pageToken);
  if (params.maxResults) search.set('maxResults', String(params.maxResults));
  return apiRequest(`/youtube/playlist-items?playlistId=${encodeURIComponent(playlistId)}${search.toString() ? `&${search.toString()}` : ''}`);
};

export const getYouTubeVideos = async (ids: string[]) => {
  if (!ids || ids.length === 0) return { message: 'OK', data: { videos: [] } };
  const qs = `?ids=${encodeURIComponent(ids.join(','))}`;
  return apiRequest(`/youtube/videos${qs}`);
};

// === Coach Subject Preferences & Videos ===
export const getCoachSubjectPreferences = async (studentId: string, subject?: string) => {
  const search = new URLSearchParams();
  search.set('studentId', studentId);
  if (subject) search.set('subject', subject);
  return apiRequest(`/coach/subject-preferences?${search.toString()}`);
};

// Student-facing: get the current user's saved subject preferences (playlist) - uses token to identify student
export const getMySubjectPreferences = async (subject?: string) => {
  const search = new URLSearchParams();
  if (subject) search.set('subject', subject);
  return apiRequest(`/daily-plans/subject-preferences${search.toString() ? `?${search.toString()}` : ''}`);
};

export const createCoachSubjectPreference = async (payload: { studentId: string; subject: string; teacherName?: string; playlistId: string; playlistTitle?: string; channelId?: string; channelTitle?: string }) => {
  return apiRequest('/coach/subject-preferences', { method: 'POST', body: JSON.stringify(payload) });
};

export const getCoachUsedVideos = async (studentId: string, subject: string, days = 120) => {
  const search = new URLSearchParams();
  search.set('studentId', studentId);
  search.set('subject', subject);
  search.set('days', String(days));
  return apiRequest(`/coach/used-videos?${search.toString()}`);
};

export const patchCoachProgramSubjectVideos = async (planId: string, subjectIndex: number, payload: { add?: any[]; remove?: string[]; reorder?: { videoId: string; order: number }[] }) => {
  return apiRequest(`/coach/programs/${planId}/subjects/${subjectIndex}/videos`, { method: 'PATCH', body: JSON.stringify(payload) });
};

// ==== Flashcards (Topic-based Soru-Cevap Kartları) ====
export type Flashcard = {
  _id: string;
  subject?: string;
  topic: string;
  question: string;
  answer: string;
  tags?: string[];
  stats?: { timesShown: number; timesCorrect: number; difficulty: number; lastReviewedAt?: string; nextReviewAt?: string };
  successRate?: number;
  createdAt: string;
  updatedAt: string;
};

export const createFlashcard = async (payload: { subject?: string; topic: string; question: string; answer: string; tags?: string[]; difficulty?: number; }) => {
  return apiRequest('/flashcards', { method: 'POST', body: JSON.stringify(payload) });
};

export const listFlashcards = async (params: { topic?: string; subject?: string; search?: string } = {}) => {
  const search = new URLSearchParams();
  if (params.topic) search.set('topic', params.topic);
  if (params.subject) search.set('subject', params.subject);
  if (params.search) search.set('search', params.search);
  const qs = search.toString();
  return apiRequest(`/flashcards${qs ? `?${qs}` : ''}`);
};

export const updateFlashcard = async (id: string, payload: { subject?: string; topic?: string; question?: string; answer?: string; tags?: string[]; difficulty?: number; isActive?: boolean }) => {
  return apiRequest(`/flashcards/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
};

export const deleteFlashcard = async (id: string) => {
  return apiRequest(`/flashcards/${id}`, { method: 'DELETE' });
};

export const getPracticeFlashcards = async (topic: string, limit = 10) => {
  const search = new URLSearchParams();
  search.set('topic', topic);
  search.set('limit', String(limit));
  return apiRequest(`/flashcards/practice/random?${search.toString()}`);
};

export const submitFlashcardPractice = async (id: string, correct: boolean) => {
  return apiRequest(`/flashcards/${id}/practice`, { method: 'POST', body: JSON.stringify({ correct }) });
};

// ==== Advanced Analytics (Server Aggregated) ====
export interface AdvancedAnalyticsResponse {
  range: 'daily' | 'weekly' | 'monthly';
  from: string;
  to: string;
  timeSeries: Array<{ date: string; totalTime: number; sessionCount: number; avgQuality: number }>;
  subjectStats: Array<{
    subject: string;
    totalTime: number;
    sessionCount: number;
    avgQuality: number;
    correctAnswers: number;
    wrongAnswers: number;
    blankAnswers: number;
  }>;
  techniqueDistribution: Array<{ technique: string; count: number }>;
  questionStatsSummary: {
    totalTargetQuestions: number;
    totalAttempted: number;
    totalCorrect: number;
    totalWrong: number;
    totalBlank: number;
    avgCompletionRate: number;
    accuracyPercent: number;
  };
  overall: {
    totalStudyTime: number;
    sessionCount: number;
    averageQuality: number;
    averageEfficiency: number;
    completionRate: number;
    consistencyScore: number;
    focusScore: number;
    velocityScore: number;
  };
  sessions?: any[]; // optional raw sessions when includeSessions=true
  meta: { generatedAt: string };
}

export const getAdvancedAnalytics = async (params: { range?: 'daily' | 'weekly' | 'monthly'; subjects?: string[]; includeSessions?: boolean } = {}): Promise<{ message: string; data: AdvancedAnalyticsResponse }> => {
  const search = new URLSearchParams();
  if (params.range) search.set('range', params.range);
  if (params.subjects && params.subjects.length) search.set('subjects', params.subjects.join(','));
  if (params.includeSessions) search.set('includeSessions', 'true');
  const qs = search.toString();
  return apiRequest(`/analytics/advanced${qs ? `?${qs}` : ''}`);
};

