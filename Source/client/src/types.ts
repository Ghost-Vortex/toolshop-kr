/** Категории (роли) пользователей приложения */
export type Role = 'admin' | 'manager' | 'customer';

/** Статусы заказа */
export type OrderStatus = 'new' | 'processing' | 'shipped' | 'completed' | 'cancelled';

/** Пользователь в том виде, в каком его возвращает сервер */
export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/** Категория каталога */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  productsCount?: number;
}

/** Карточка товара */
export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  stock: number;
  brand: string;
  categoryId: string;
  categoryName: string;
  image: string;
  isArchived: boolean;
  rating: number;
  reviewsCount: number;
}

/** Позиция заказа */
export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  sum: number;
}

/** Заказ */
export interface Order {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  address: string;
  phone: string;
  comment?: string;
  createdAt: string;
}

/** Отзыв о товаре */
export interface Review {
  id: string;
  productId: string;
  authorId: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
}

/** Результат постраничной выборки */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Ответ сервера при успешной аутентификации */
export interface AuthResponse {
  accessToken: string;
  expiresIn: string;
  user: User;
}

/** Сводная статистика по заказам */
export interface OrdersSummary {
  total: number;
  revenue: number;
  averageCheck: number;
  byStatus: Record<OrderStatus, number>;
}

/** Позиция корзины, сохраняемая в localStorage */
export interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image: string;
}
