import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/context/AuthContext";
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
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

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

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/leads" element={<Leads />} />
                      <Route path="/teachers" element={<Teachers />} />
                      <Route path="/teachers/:id" element={<TeacherDetail />} />
                      <Route path="/students" element={<Students />} />
                      <Route path="/students/:id" element={<StudentDetail />} />
                      <Route path="/schedule" element={<Schedule />} />
                      <Route path="/groups" element={<Groups />} />
                      <Route path="/individual-lessons" element={<IndividualLessons />} />
                      <Route path="/finance" element={<Finance />} />
                      <Route path="/subscriptions" element={<Subscriptions />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
