import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React from "react";
// antd tema sağlayıcısı artık ayrı bir context içinde
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DesignProvider } from "./contexts/DesignContext";
import { AntdThemeProvider } from "./contexts/AntdThemeProvider";
import { ProtectedRoute, HomeRoute } from "./components/layout";
import Login from "./views/LoginPage/Login";
import ForgotPassword from "./views/LoginPage/ForgotPassword";
import ResetPassword from "./views/LoginPage/ResetPassword";
import Register from "./views/LoginPage/Register";
import VerifyEmail from "./views/LoginPage/VerifyEmail";
import Dashboard from "./views/DashboardPage/Dashboard";
import Profile from "./views/ProfilePage/Profile";
import EducationInfo from "./views/EducationInfo";
import Goals from "./views/GoalsPage/Goals";
import StudyTrackerSessions from "./views/StudyTrackerPage/subpages/StudyTrackerSessions";
import StudyTrackerCalendar from "./views/StudyTrackerPage/subpages/StudyTrackerCalendar";
import StudyTrackerRoom from "./views/StudyTrackerPage/subpages/StudyTrackerRoom";
import StudyTrackerTimer from "./views/StudyTrackerPage/subpages/StudyTrackerTimer";
import DailyPlanPage from "./views/StudyPlanPage/subpages/DailyPlanPage";
// Eski StudentExams bileşeni kaldırıldı (denemeler takvim modalında yönetiliyor)
import TopicMatrix from "./views/TopicMatrix/TopicMatrix";
import CoachDashboard from "./views/CoachDashboard/CoachDashboard";
import { AppLayout } from "./components/layout";
import ProgramManager from "./views/CoachDashboard/ProgramManager";
import StudentsList from "./views/CoachDashboard/StudentsList";
import StudentDetail from "./views/CoachDashboard/StudentDetail";
import CreateProgram from "./views/CoachDashboard/CreateProgram";
import StudentCoachPage from "./views/StudentCoach/StudentCoachPage";
// StudentProgramDetail import'u kaldırıldı
import FeedbackDetail from "./views/Admin/FeedbackDetail";
import AdminDashboard from "./views/AdminDashboard/AdminDashboard";
import CoachesList from "./views/Admin/CoachesList";
import CoachDetail from "./views/Admin/CoachDetail";
import AssignmentManager from "./views/Admin/AssignmentManager";
import Statistics from "./views/Admin/Statistics";
import ErrorPage from "./components/ErrorPage/ErrorPage";
import FlashcardsPage from "./views/Flashcards/Flashcards";
import AchievementsPage from "./views/StudyPlanPage/bones/Achievements/AchievementsPage";
// Routing bileşeni (tema sağlayıcıdan bağımsız)
function ThemedApp() {
  return (
    <AuthProvider>
      <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/" element={<HomeRoute />} />
              
              {/* Test Error Page Routes */}
              <Route path="/test-error" element={<ErrorPage />} />
              <Route path="/test-error/network" element={<ErrorPage errorType="network" />} />
              <Route path="/test-error/auth" element={<ErrorPage errorType="auth" />} />
              <Route path="/test-error/notfound" element={<ErrorPage errorType="notFound" />} />
              <Route path="/test-error/server" element={<ErrorPage errorType="server" errorCode="500" />} />

              {/* Protected Routes - AppLayout ile sarmalanır */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Routes>
                        {/* Student routes */}
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/student/coach"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <StudentCoachPage />
                            </ProtectedRoute>
                          }
                        />
                         {/* StudentProgramDetail route'u kaldırıldı */}
                        {/* /student/exams route'u kaldırıldı - denemeler StudyCalendar DayModal üzerinden yönetiliyor */}
                        {/* Study Tracker nested pages */}
                        <Route
                          path="/study-tracker"
                          element={<Navigate to="/study-tracker/sessions" replace />}
                        />
                        <Route
                          path="/study-tracker/timer"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <StudyTrackerTimer />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/study-tracker/sessions"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <StudyTrackerSessions />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/study-tracker/calendar"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <StudyTrackerCalendar />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/study-tracker/study-room"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <StudyTrackerRoom />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/study-tracker/coach-programs"
                          element={<Navigate to="/study-plan" replace />}
                        />
                        <Route
                          path="/study-plan"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <DailyPlanPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/topic-matrix"
                          element={
                            <ProtectedRoute allowedRoles={["student", "coach"]}>
                              <TopicMatrix />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/flashcards"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <FlashcardsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/study-plan/achievements"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <AchievementsPage />
                            </ProtectedRoute>
                          }
                        />

                        {/* Coach routes */}
                        <Route
                          path="/coach/programs"
                          element={
                            <ProtectedRoute allowedRoles={["coach", "admin"]}>
                              <ProgramManager />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/coach-dashboard"
                          element={
                            <ProtectedRoute allowedRoles={["coach", "admin"]}>
                              <CoachDashboard />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/coach/students"
                          element={
                            <ProtectedRoute allowedRoles={["coach", "admin"]}>
                              <StudentsList />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/coach/students/:id"
                          element={
                            <ProtectedRoute allowedRoles={["coach", "admin"]}>
                              <StudentDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/coach/programs/create"
                          element={
                            <ProtectedRoute allowedRoles={["coach", "admin"]}>
                              <CreateProgram />
                            </ProtectedRoute>
                          }
                        />

                        {/* Admin routes */}
                        <Route
                          path="/admin-dashboard"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AdminDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/coaches"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <CoachesList />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/coaches/:id"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <CoachDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/assignments"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AssignmentManager />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/statistics"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <Statistics />
                            </ProtectedRoute>
                          }
                        />
                        {/* Eski rota için yönlendirme */}
                        <Route
                          path="/admin/feedback"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <Navigate to="/admin/statistics" replace />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/feedback/:id"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <FeedbackDetail />
                            </ProtectedRoute>
                          }
                        />

                        {/* Shared */}
                        <Route path="/profile" element={<Profile />} />
                        <Route
                          path="/education"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <EducationInfo />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/goals"
                          element={
                            <ProtectedRoute allowedRoles={["student"]}>
                              <Goals />
                            </ProtectedRoute>
                          }
                        />
                      </Routes>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
      </Router>
    </AuthProvider>
  );
}

// Modern Error Boundary
class RootErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    // TODO: Sentry/Log servis entegrasyonu
    console.error('Uygulama hatası:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <ErrorPage />;
    }
    return this.props.children as React.ReactElement;
  }
}

function App() {
  return (
    <ThemeProvider>
      <RootErrorBoundary>
        <DesignProvider>
          <AntdThemeProvider>
            <ThemedApp />
          </AntdThemeProvider>
        </DesignProvider>
      </RootErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
