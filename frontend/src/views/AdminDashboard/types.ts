// Shared types and helpers for Admin Dashboard components

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'coach' | 'admin';
  profileCompleteness: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'banned';
  registrationDate: string;
}

export interface SystemMetrics {
  totalUsers: number;
  totalStudents: number;
  totalCoaches: number;
  totalSessions: number;
  totalQuestions: number;
  avgSessionTime: number;
  systemLoad: number;
  databaseSize: number;
  activeUsers: number;
  responseTime: number;
}

export const getRoleInfo = (role: string) => {
  const roleConfig = {
    admin: { color: 'red', text: 'Admin' },
    coach: { color: 'blue', text: 'Koç' },
    student: { color: 'green', text: 'Öğrenci' }
  } as const;
  return roleConfig[role as keyof typeof roleConfig] || { color: 'default', text: role };
};

export const getStatusInfo = (status: string) => {
  const statusConfig = {
    active: { color: 'success', text: 'Aktif' },
    inactive: { color: 'warning', text: 'Pasif' },
    banned: { color: 'error', text: 'Yasaklı' }
  } as const;
  return statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
};
