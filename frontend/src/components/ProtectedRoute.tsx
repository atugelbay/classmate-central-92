import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  role?: string;
  anyRole?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  role,
  anyRole,
}) => {
  const { isAuthenticated, isLoading, hasPermission, hasRole, hasAnyRole } = useAuth();

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

  // Check permission
  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Доступ запрещен</h2>
          <p className="text-muted-foreground">
            У вас нет прав для доступа к этой странице
          </p>
        </div>
      </div>
    );
  }

  // Check role
  if (role && !hasRole(role)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Доступ запрещен</h2>
          <p className="text-muted-foreground">
            Для доступа требуется роль: {role}
          </p>
        </div>
      </div>
    );
  }

  // Check any role
  if (anyRole && !hasAnyRole(anyRole)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Доступ запрещен</h2>
          <p className="text-muted-foreground">
            Для доступа требуется одна из следующих ролей
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

