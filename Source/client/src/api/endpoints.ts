import { apiRequest } from './client';
import type {
  AuthResponse,
  Category,
  Order,
  OrderStatus,
  OrdersSummary,
  Paginated,
  Product,
  Review,
  Role,
  User,
} from '../types';

/** Параметры выборки каталога */
export interface CatalogParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
}

/** Операции авторизации */
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (body: { name: string; email: string; password: string; age?: number }) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body }),
  profile: () => apiRequest<User>('/auth/profile'),
};

/** Операции с пользователями */
export const usersApi = {
  list: () => apiRequest<User[]>('/users'),
  byId: (id: string) => apiRequest<User>(`/users/${id}`),
  create: (body: { name: string; email: string; age?: number; password?: string }) =>
    apiRequest<User>('/users', { method: 'POST', body }),
  changeRole: (id: string, role: Role) =>
    apiRequest<User>(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
  remove: (id: string) => apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
};

/** Операции с категориями */
export const categoriesApi = {
  list: () => apiRequest<Category[]>('/categories'),
  create: (body: { name: string; slug: string; description?: string }) =>
    apiRequest<Category>('/categories', { method: 'POST', body }),
  remove: (id: string) => apiRequest<void>(`/categories/${id}`, { method: 'DELETE' }),
};

/** Операции с каталогом товаров */
export const productsApi = {
  list: (params: CatalogParams) =>
    apiRequest<Paginated<Product>>('/products', { query: { ...params } }),
  byId: (id: string) => apiRequest<Product>(`/products/${id}`),
  management: () => apiRequest<Product[]>('/products/management'),
  create: (body: Record<string, unknown>) =>
    apiRequest<Product>('/products', { method: 'POST', body }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<Product>(`/products/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => apiRequest<{ archived: boolean }>(`/products/${id}`, { method: 'DELETE' }),
};

/** Операции с заказами */
export const ordersApi = {
  list: (status?: OrderStatus) => apiRequest<Order[]>('/orders', { query: { status } }),
  create: (body: {
    items: Array<{ productId: string; quantity: number }>;
    address: string;
    phone: string;
    comment?: string;
  }) => apiRequest<Order>('/orders', { method: 'POST', body }),
  changeStatus: (id: string, status: OrderStatus) =>
    apiRequest<Order>(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  cancel: (id: string) => apiRequest<Order>(`/orders/${id}/cancel`, { method: 'PATCH' }),
  summary: () => apiRequest<OrdersSummary>('/orders/summary'),
};

/** Операции с отзывами */
export const reviewsApi = {
  byProduct: (productId: string) => apiRequest<Review[]>(`/reviews/product/${productId}`),
  create: (body: { productId: string; rating: number; text: string }) =>
    apiRequest<Review>('/reviews', { method: 'POST', body }),
  remove: (id: string) => apiRequest<void>(`/reviews/${id}`, { method: 'DELETE' }),
};
