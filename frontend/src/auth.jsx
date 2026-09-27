import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!getToken()) { setLoading(false); return; }
      try {
        const { user } = await api.get('/auth/me');
        if (active) setUser(user);
      } catch (_) {
        setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  async function login(identifier, password) {
    const { token, user } = await api.post('/auth/login', { identifier, password });
    setToken(token);
    setUser(user);
    return user;
  }

  async function register(payload) {
    const { token, user } = await api.post('/auth/register', payload);
    setToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  async function refresh() {
    try {
      const { user } = await api.get('/auth/me');
      setUser(user);
    } catch (_) { /* ignore */ }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
