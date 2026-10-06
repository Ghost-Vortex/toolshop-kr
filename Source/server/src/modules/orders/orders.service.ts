import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryDatabase } from '../../database/in-memory.database';
import { ALLOWED_STATUS_TRANSITIONS, OrderStatus } from '../../common/enums/order-status.enum';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { Order, OrderItem } from './entities/order.entity';

/** Сводная статистика по заказам для панели управления */
export interface OrdersSummary {
  total: number;
  revenue: number;
  averageCheck: number;
  byStatus: Record<OrderStatus, number>;
}

/**
 * Сервис заказов. Реализует оформление заказа, контроль остатков
 * и управление жизненным циклом заказа по схеме допустимых переходов.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly database: InMemoryDatabase,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * Оформление заказа.
   * Состав заказа собирается на сервере по идентификаторам товаров:
   * цена берётся из каталога, а не из запроса клиента.
   */
  create(dto: CreateOrderDto, customer: AuthUser): Order {
    const merged = this.mergeItems(dto);

    const items: OrderItem[] = merged.map(({ productId, quantity }) => {
      const product = this.productsService.getOrFail(productId);

      if (product.isArchived) {
        throw new ConflictException(`Товар «${product.name}» снят с продажи`);
      }
      if (product.stock < quantity) {
        throw new ConflictException(
          `Недостаточно товара «${product.name}» на складе: доступно ${product.stock} шт.`,
        );
      }

      return {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
        sum: product.price * quantity,
      };
    });

    items.forEach((item) => this.productsService.decreaseStock(item.productId, item.quantity));

    return this.database.orders.create({
      number: this.nextNumber(),
      customerId: customer.id,
      customerName: customer.name,
      status: OrderStatus.New,
      items,
      total: items.reduce((sum, item) => sum + item.sum, 0),
      address: dto.address,
      phone: dto.phone,
      comment: dto.comment,
    });
  }

  /** Список заказов; покупатель видит только собственные заказы */
  findAll(query: OrderQueryDto, actor: AuthUser): Order[] {
    const isStaff = actor.role === Role.Admin || actor.role === Role.Manager;

    return this.database.orders
      .findBy((order) => {
        if (!isStaff && order.customerId !== actor.id) {
          return false;
        }
        if (query.status && order.status !== query.status) {
          return false;
        }
        if (isStaff && query.customerId && order.customerId !== query.customerId) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Заказ по идентификатору; доступен владельцу и сотрудникам магазина */
  findById(id: string, actor: AuthUser): Order {
    const order = this.getOrFail(id);
    const isStaff = actor.role === Role.Admin || actor.role === Role.Manager;

    if (!isStaff && order.customerId !== actor.id) {
      throw new ForbiddenException('Заказ принадлежит другому покупателю');
    }

    return order;
  }

  /**
   * Смена статуса заказа сотрудником магазина.
   * Допустимость перехода проверяется по схеме ALLOWED_STATUS_TRANSITIONS.
   */
  changeStatus(id: string, status: OrderStatus): Order {
    const order = this.getOrFail(id);

    if (order.status === status) {
      return order;
    }

    if (!ALLOWED_STATUS_TRANSITIONS[order.status].includes(status)) {
      throw new ConflictException(
        `Недопустимый переход статуса: «${order.status}» → «${status}»`,
      );
    }

    if (status === OrderStatus.Cancelled) {
      order.items.forEach((item) => this.productsService.increaseStock(item.productId, item.quantity));
    }

    return this.database.orders.update(id, { status }) as Order;
  }

  /** Отмена заказа покупателем; возможна только до начала сборки */
  cancel(id: string, actor: AuthUser): Order {
    const order = this.findById(id, actor);

    if (order.status !== OrderStatus.New) {
      throw new ConflictException('Отменить можно только заказ в статусе «новый»');
    }

    return this.changeStatus(id, OrderStatus.Cancelled);
  }

  /** Сводная статистика по всем заказам */
  summary(): OrdersSummary {
    const orders = this.database.orders.findAll();
    const paid = orders.filter((order) => order.status !== OrderStatus.Cancelled);
    const revenue = paid.reduce((sum, order) => sum + order.total, 0);

    const byStatus = Object.values(OrderStatus).reduce(
      (acc, status) => ({ ...acc, [status]: orders.filter((o) => o.status === status).length }),
      {} as Record<OrderStatus, number>,
    );

    return {
      total: orders.length,
      revenue,
      averageCheck: paid.length ? Math.round(revenue / paid.length) : 0,
      byStatus,
    };
  }

  /** Возвращает заказ либо выбрасывает 404 */
  private getOrFail(id: string): Order {
    const order = this.database.orders.findById(id);
    if (!order) {
      throw new NotFoundException(`Заказ с идентификатором ${id} не найден`);
    }
    return order;
  }

  /** Объединяет повторяющиеся позиции заказа в одну */
  private mergeItems(dto: CreateOrderDto): Array<{ productId: string; quantity: number }> {
    const merged = new Map<string, number>();
    dto.items.forEach((item) => {
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
    });
    return Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }));
  }

  /** Формирует следующий номер заказа вида TS-000004 */
  private nextNumber(): string {
    const next = this.database.orders.size + 1;
    return `TS-${String(next).padStart(6, '0')}`;
  }
}
