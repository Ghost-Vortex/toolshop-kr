import { BaseEntity } from '../../../database/base.entity';
import { OrderStatus } from '../../../common/enums/order-status.enum';

/**
 * Позиция заказа. Цена и наименование фиксируются в момент оформления,
 * поэтому последующее изменение карточки товара не искажает историю заказов.
 */
export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  /** Стоимость позиции: price × quantity */
  sum: number;
}

/** Заказ покупателя */
export interface Order extends BaseEntity {
  /** Человекочитаемый номер заказа вида TS-000001 */
  number: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  /** Итоговая сумма заказа */
  total: number;
  address: string;
  phone: string;
  comment?: string;
}
