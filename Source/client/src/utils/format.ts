import type { OrderStatus } from '../types';

/** Форматирует сумму в рублях по правилам русской типографики */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Форматирует дату в виде 01.04.2026, 09:00 */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Человекочитаемые названия статусов заказа */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  processing: 'В сборке',
  shipped: 'Передан в доставку',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

/** Склонение существительного по числу: 1 товар, 2 товара, 5 товаров */
export function plural(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return forms[1];
  }
  return forms[2];
}
