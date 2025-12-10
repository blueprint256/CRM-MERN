import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });

      if (response.data.requirePasswordChange) {
        return { requirePasswordChange: true };
      }

      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      setError(message);
      throw new Error(message);
    }
  };

  // Login with token (for OAuth callback)
  const loginWithToken = async (token) => {
    try {
      setError(null);
      localStorage.setItem('token', token);
      await fetchUser();
      return { success: true };
    } catch (error) {
      localStorage.removeItem('token');
      const message = error.response?.data?.error || 'Authentication failed';
      setError(message);
      throw new Error(message);
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);
      const response = await api.post('/auth/signup', userData);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Signup failed';
      setError(message);
      throw new Error(message);
    }
  };

  const changePassword = async (email, currentPassword, newPassword) => {
    try {
      setError(null);
      const response = await api.post('/auth/change-password', {
        email,
        currentPassword,
        newPassword
      });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Password change failed';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    loginWithToken,
    signup,
    logout,
    changePassword,
    isAuthenticated: !!user,
    isSystemAdmin: user?.role === 'system'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
