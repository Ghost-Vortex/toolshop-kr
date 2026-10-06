import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminCategories } from './admin/AdminCategories';
import { AdminOrders } from './admin/AdminOrders';
import { AdminProducts } from './admin/AdminProducts';
import { AdminUsers } from './admin/AdminUsers';
import type { Role } from '../types';

/** Название вкладки панели управления */
type TabKey = 'orders' | 'products' | 'categories' | 'users';

/** Вкладка и роли, которым она доступна */
interface Tab {
  key: TabKey;
  label: string;
  roles: Role[];
}

const TABS: Tab[] = [
  { key: 'orders', label: 'Заказы', roles: ['admin', 'manager'] },
  { key: 'products', label: 'Товары', roles: ['admin', 'manager'] },
  { key: 'categories', label: 'Категории', roles: ['admin', 'manager'] },
  { key: 'users', label: 'Пользователи', roles: ['admin'] },
];

/**
 * Панель управления магазином.
 * Какие вкладки видит пользователь, зависит от его роли: менеджер
 * работает с каталогом и заказами, администратор ещё и с пользователями.
 */
export function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('orders');

  const available = TABS.filter((item) => user !== null && item.roles.includes(user.role));

  return (
    <section>
      <h1 className="section-title">Панель управления</h1>

      <div className="tabs" role="tablist">
        {available.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? 'tab tab--active' : 'tab'}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && <AdminOrders />}
      {tab === 'products' && <AdminProducts />}
      {tab === 'categories' && <AdminCategories />}
      {tab === 'users' && <AdminUsers />}
    </section>
  );
}
