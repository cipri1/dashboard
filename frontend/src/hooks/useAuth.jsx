import { createContext, useContext, useState } from 'react';
import { api } from '../api/client';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  async function login(username, password) {
    const data = await api.login({ username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
