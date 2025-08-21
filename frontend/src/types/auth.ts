export interface User {
    _id: string;
    fullName: string;
    email: string;
    role: 'admin' | 'coach' | 'student';
    plan?: {
      tier?: 'free' | 'premium';
      status?: 'active' | 'expired' | 'cancelled';
      startedAt?: string;
      expiresAt?: string | null;
    };
    entitlements?: string[];
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other' | '';
    bio?: string;
    avatar?: string;
    currentSchool?: string;
    schoolType?: string;
    grade?: string;
    city?: string;
    targetYear?: number;
    targetUniversities?: Array<{
      name: string;
      department: string;
      priority: number;
    }>;
    targetFieldType?: string;
    preferences?: {
      notifications: boolean;
      emailNotifications: boolean;
      studyReminders: boolean;
      weeklyReports: boolean;
      theme: 'light' | 'dark' | 'auto';
      language: 'tr' | 'en';
    };
    stats?: {
      totalStudyTime: number;
      totalTests: number;
      averageScore: number;
      currentStreak: number;
      bestStreak: number;
      lastActivity: string;
    };
    isActive?: boolean;
    isEmailVerified?: boolean;
    lastLoginAt?: string;
    profileCompleteness?: number;
    hasSeenTutorial?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    loading: boolean;
  }

  export interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => void;
    updateUser: (userData: Partial<User>) => void;
  }

  // Profile-specific interfaces
  export interface ProfileFormData {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other' | '';
    bio?: string;
  }

  export interface ProfileUpdateResponse {
    message: string;
    data: User;
  }