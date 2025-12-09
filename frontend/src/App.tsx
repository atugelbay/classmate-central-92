import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Teachers from "./pages/Teachers";
import TeacherDetail from "./pages/TeacherDetail";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Schedule from "./pages/Schedule";
import Groups from "./pages/Groups";
import IndividualLessons from "./pages/IndividualLessons";
import Finance from "./pages/Finance";
import Subscriptions from "./pages/Subscriptions";
import Settings from "./pages/Settings";
import Roles from "./pages/Roles";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";
import { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Отключить перезагрузку при фокусе окна
      refetchOnMount: false, // Не перезагружать при монтировании если данные есть
      staleTime: 5 * 60 * 1000, // Данные считаются свежими 5 минут
      retry: 1, // Повторить только один раз при ошибке
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RequirePermission = ({ permission, children }: { permission: string; children: ReactNode }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        Нет доступа к этому разделу
      </div>
    );
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Allow verify-email and invite pages even if already signed in
  if (isAuthenticated && location.pathname !== "/verify-email" && location.pathname !== "/invite") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />
              <Route
                path="/verify-email"
                element={
                  <PublicRoute>
                    <VerifyEmail />
                  </PublicRoute>
                }
              />
              <Route
                path="/invite"
                element={
                  <PublicRoute>
                    <AcceptInvite />
                  </PublicRoute>
                }
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route
                          path="/leads"
                          element={
                            <RequirePermission permission="leads.view">
                              <Leads />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/teachers"
                          element={
                            <RequirePermission permission="teachers.view">
                              <Teachers />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/teachers/:id"
                          element={
                            <RequirePermission permission="teachers.view">
                              <TeacherDetail />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/students"
                          element={
                            <RequirePermission permission="students.view">
                              <Students />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/students/:id"
                          element={
                            <RequirePermission permission="students.view">
                              <StudentDetail />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/schedule"
                          element={
                            <RequirePermission permission="schedule.view">
                              <Schedule />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/groups"
                          element={
                            <RequirePermission permission="groups.view">
                              <Groups />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/individual-lessons"
                          element={
                            <RequirePermission permission="lessons.view">
                              <IndividualLessons />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/finance"
                          element={
                            <RequirePermission permission="finance.view">
                              <Finance />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/subscriptions"
                          element={
                            <RequirePermission permission="subscriptions.view">
                              <Subscriptions />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/settings"
                          element={
                            <RequirePermission permission="settings.view">
                              <Settings />
                            </RequirePermission>
                          }
                        />
                        <Route
                          path="/roles"
                          element={
                            <RequirePermission permission="roles.view">
                              <Roles />
                            </RequirePermission>
                          }
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
