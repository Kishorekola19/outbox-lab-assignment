import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithDemo: (email?: string, name?: string) => Promise<void>;
  loginWithGoogleToken: (idToken: string) => Promise<void>;
  setTokenAndFetchUser: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user: fetchedUser } = await authApi.getMe();
      setUser(fetchedUser);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const loginWithDemo = async (email?: string, name?: string) => {
    try {
      setLoading(true);
      const { user: loggedUser, token } = await authApi.demoLogin(email, name);
      localStorage.setItem('token', token);
      setUser(loggedUser);
      toast.success(`Welcome back, ${loggedUser.name}!`);
    } catch (error: any) {
      toast.error(error.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogleToken = async (idToken: string) => {
    try {
      setLoading(true);
      const { user: loggedUser, token } = await authApi.verifyGoogleToken(idToken);
      localStorage.setItem('token', token);
      setUser(loggedUser);
      toast.success(`Logged in with Google as ${loggedUser.name}!`);
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const setTokenAndFetchUser = async (token: string) => {
    localStorage.setItem('token', token);
    await fetchUser();
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      toast.success('Logged out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithDemo,
        loginWithGoogleToken,
        setTokenAndFetchUser,
        logout,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
