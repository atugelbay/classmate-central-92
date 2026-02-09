import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, AuthResponse, OnboardingAction } from '@/api/auth';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, companyName: string, phone: string) => Promise<void>;
  handleAuth: (response: AuthResponse) => void;
  logout: () => void;
  hasPermission: (permissionName: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  updateOnboardingStatus: (action: "complete" | "skip" | "reset") => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistUser = (nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        persistUser(parsedUser);
        // Refresh user data from server to get latest roles and permissions
        authAPI.me().then((freshUser) => {
          persistUser(freshUser);
        }).catch(() => {
          // If refresh fails, keep cached user
        });
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleAuthResponse = (response: AuthResponse) => {
    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
    persistUser(response.user);
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    handleAuthResponse(response);
  };

  const register = async (name: string, email: string, password: string, companyName: string, phone: string) => {
    const response = await authAPI.register({ name, email, password, companyName, phone });
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

  const updateOnboardingStatus = async (action: OnboardingAction): Promise<User> => {
    try {
      const updatedUser = await authAPI.updateOnboarding(action);
      persistUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error("Failed to update onboarding status", error);
      throw error;
    }
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
        updateOnboardingStatus,
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

