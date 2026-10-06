import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader } from './Message';
import type { Role } from '../types';

interface ProtectedRouteProps {
  roles?: Role[];
  children: JSX.Element;
}

/**
 * Ограничение доступа к разделу на стороне клиента.
 * Неавторизованный посетитель переадресуется на страницу входа,
 * а пользователь с недостаточными правами — на страницу каталога.
 * Клиентская проверка служит удобству; окончательное решение
 * во всех случаях принимает сервер.
 */
export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader text="Проверка прав доступа…" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
