import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/endpoints';
import { readToken, writeToken } from '../api/client';
import type { Role, User } from '../types';

/** Что контекст даёт компонентам */
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; age?: number }) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Хранит данные вошедшего пользователя.
 * Токен лежит в localStorage, поэтому вход не теряется при перезагрузке
 * страницы: при запуске приложение проверяет токен запросом /auth/profile.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!readToken()) {
      setLoading(false);
      return;
    }

    authApi
      .profile()
      .then(setUser)
      .catch(() => writeToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    writeToken(response.accessToken);
    setUser(response.user);
  }

  async function register(data: { name: string; email: string; password: string; age?: number }) {
    const response = await authApi.register(data);
    writeToken(response.accessToken);
    setUser(response.user);
  }

  function logout() {
    writeToken(null);
    setUser(null);
  }

  function hasRole(...roles: Role[]) {
    return user !== null && roles.includes(user.role);
  }

  const value: AuthContextValue = { user, loading, login, register, logout, hasRole };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Доступ к контексту из компонентов */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}
