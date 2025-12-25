import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, AuthResponse } from '@/api/auth';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, companyName: string) => Promise<void>;
  handleAuth: (response: AuthResponse) => void;
  logout: () => void;
  hasPermission: (permissionName: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    console.log('[AuthContext] Initializing:', {
      hasToken: !!token,
      hasSavedUser: !!savedUser,
    });
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Refresh user data from server to get latest roles and permissions
        authAPI.me().then((freshUser) => {
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }).catch((error) => {
          console.error('[AuthContext] Failed to refresh user data:', error);
          // If refresh fails, keep cached user
        });
      } catch (error) {
        console.error('[AuthContext] Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    } else {
      console.warn('[AuthContext] No token or user found in localStorage');
    }
    
    setIsLoading(false);
  }, []);

  const handleAuthResponse = (response: AuthResponse) => {
    console.log('[AuthContext] Saving auth response:', {
      hasToken: !!response.token,
      hasRefreshToken: !!response.refreshToken,
      hasUser: !!response.user,
    });
    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
    console.log('[AuthContext] Token saved to localStorage:', !!localStorage.getItem('token'));
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    handleAuthResponse(response);
  };

  const register = async (name: string, email: string, password: string, companyName: string) => {
    const response = await authAPI.register({ name, email, password, companyName });
    handleAuthResponse(response);
  };

  const handleAuth = (response: AuthResponse) => {
    handleAuthResponse(response);
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    // Полная перезагрузка страницы для сброса всех данных
    window.location.href = "/login";
  };

  const hasPermission = (permissionName: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permissionName);
  };

  const hasRole = (roleName: string): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.name === roleName);
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => roleNames.includes(role.name));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        handleAuth,
        logout,
        hasPermission,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

