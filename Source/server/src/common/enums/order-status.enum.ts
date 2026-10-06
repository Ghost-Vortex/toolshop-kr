/** Статусы жизненного цикла заказа */
export enum OrderStatus {
  /** Новый заказ, оформлен покупателем */
  New = 'new',
  /** Заказ подтверждён менеджером и собирается */
  Processing = 'processing',
  /** Заказ передан в доставку */
  Shipped = 'shipped',
  /** Заказ получен покупателем */
  Completed = 'completed',
  /** Заказ отменён */
  Cancelled = 'cancelled',
}

/**
 * Допустимые переходы между статусами заказа.
 * Проверяются в OrdersService перед изменением статуса.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.New]: [OrderStatus.Processing, OrderStatus.Cancelled],
  [OrderStatus.Processing]: [OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Completed],
  [OrderStatus.Completed]: [],
  [OrderStatus.Cancelled]: [],
};
