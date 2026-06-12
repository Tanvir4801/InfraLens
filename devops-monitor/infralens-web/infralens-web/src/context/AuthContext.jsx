import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as loginApi, logout as logoutApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) { try { setUser(JSON.parse(saved)); } catch {} }
  }, []);

  const login = async (username, password) => {
    const data = await loginApi(username, password);
    const userData = { username: data.username || username, role: data.role, email: data.email || '' };
    setUser(userData);
    setToken(data.access_token);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const logout = async () => {
    try { await logoutApi(); } catch {}
    setUser(null); setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasRole = (...roles) => user && roles.flat().includes(user.role);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasRole, role: user?.role }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
