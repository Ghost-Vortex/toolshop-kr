/**
 * Тонкая обёртка над Fetch API.
 * Добавляет к запросу базовый адрес и токен доступа, разбирает ответ
 * сервера и приводит любую ошибку к единому типу ApiError.
 */

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api';

/** Ключ, под которым токен доступа хранится в localStorage */
export const TOKEN_STORAGE_KEY = 'toolshop.token';

/** Ошибка обращения к программному интерфейсу */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Возвращает сохранённый токен доступа */
export function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Сохраняет либо удаляет токен доступа */
export function writeToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* хранилище браузера может быть недоступно — работаем без него */
  }
}

/** Параметры запроса к программному интерфейсу */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

/** Собирает строку запроса, отбрасывая незаданные параметры */
function buildQuery(query?: RequestOptions['query']): string {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== false) {
      params.append(key, String(value));
    }
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

/** Выполняет запрос к серверу и возвращает разобранный ответ */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;
  const token = readToken();

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Проверьте, запущена ли серверная часть приложения');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message ?? 'Не удалось выполнить запрос';
    const details = Array.isArray(message) ? message : [String(message)];
    throw new ApiError(response.status, details[0], details);
  }

  return payload as T;
}
