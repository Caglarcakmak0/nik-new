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

export const getCoachLiveDashboard = async () => {
  return apiRequest('/daily-plans/coach/live-dashboard');
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

