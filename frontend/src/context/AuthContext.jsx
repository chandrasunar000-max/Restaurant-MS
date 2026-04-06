import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verify token with backend
  const verifyToken = useCallback(async (authToken) => {
    setIsVerifyingToken(true);
    try {
      const response = await api.get('/restaurants/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response?.data) {
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
      }
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsVerifyingToken(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      verifyToken(storedToken);
    } else {
      setIsVerifyingToken(false);
      setIsAuthenticated(false);
    }
  }, [verifyToken]);

  // Logout
  const logout = async () => {
    try {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (err) {
      console.error('Logout failed:', err);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    }
  };

  // Manual login success sync
  const loginSuccess = useCallback((newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
    } else {
      // If only token is provided, verify it to get user
      verifyToken(newToken);
    }
  }, [verifyToken]);

  const value = {
    user,
    token,
    isAuthenticated,
    isVerifyingToken,
    loading,
    error,
    logout,
    loginSuccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
