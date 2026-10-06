import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Role } from '../types';

/** Подписи ролей для интерфейса */
const ROLE_LABELS: Record<Role, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  customer: 'Покупатель',
};

/**
 * Общий каркас страницы: шапка с навигацией, область содержимого и подвал.
 * Состав пунктов меню зависит от категории вошедшего пользователя.
 */
export function Layout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header__inner container">
          <NavLink to="/" className="logo">
            <span className="logo__mark" aria-hidden="true">
              ⚒
            </span>
            <span className="logo__text">
              Tool<b>Shop</b>
            </span>
          </NavLink>

          <nav className="nav" aria-label="Основная навигация">
            <NavLink to="/" end className="nav__link">
              Каталог
            </NavLink>
            {user && (
              <NavLink to="/orders" className="nav__link">
                Мои заказы
              </NavLink>
            )}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <NavLink to="/admin" className="nav__link">
                Панель управления
              </NavLink>
            )}
          </nav>

          <div className="header__actions">
            <NavLink to="/cart" className="button button--ghost cart-button">
              Корзина
              {count > 0 && <span className="cart-button__badge">{count}</span>}
            </NavLink>

            {user ? (
              <div className="user-chip">
                <span className="user-chip__name">{user.name.split(' ')[0]}</span>
                <span className="user-chip__role">{ROLE_LABELS[user.role]}</span>
                <button type="button" className="button button--ghost" onClick={handleLogout}>
                  Выйти
                </button>
              </div>
            ) : (
              <NavLink to="/login" className="button button--primary">
                Войти
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="main container">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <p>ToolShop — учебный интернет-магазин инструментов</p>
          <p>Курсовая работа по дисциплине «Клиент-серверное программирование», вариант 24</p>
        </div>
      </footer>
    </div>
  );
}
