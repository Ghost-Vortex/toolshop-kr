import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryDatabase } from '../../database/in-memory.database';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CategoriesService } from '../categories/categories.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from './orders.service';

/** Модульные тесты сервиса заказов */
describe('OrdersService', () => {
  let orders: OrdersService;
  let products: ProductsService;
  let database: InMemoryDatabase;

  const customer: AuthUser = {
    id: '22222222-2222-4222-8222-000000000003',
    email: 'kovalev@example.com',
    name: 'Ковалёв Сергей Петрович',
    role: Role.Customer,
  };

  const drillId = '33333333-3333-4333-8333-000000000001';

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, ProductsService, CategoriesService, InMemoryDatabase],
    }).compile();

    database = moduleRef.get(InMemoryDatabase);
    database.onModuleInit();
    orders = moduleRef.get(OrdersService);
    products = moduleRef.get(ProductsService);
  });

  it('оформляет заказ и списывает товар со склада', () => {
    const stockBefore = products.findById(drillId).stock;

    const order = orders.create(
      {
        items: [{ productId: drillId, quantity: 2 }],
        address: 'г. Москва, ул. Воронцовская, д. 6а, стр. 1',
        phone: '+7 (916) 100-20-30',
      },
      customer,
    );

    expect(order.number).toBe('TS-000004');
    expect(order.status).toBe(OrderStatus.New);
    expect(order.total).toBe(order.items[0].price * 2);
    expect(products.findById(drillId).stock).toBe(stockBefore - 2);
  });

  it('объединяет повторяющиеся позиции в одну', () => {
    const order = orders.create(
      {
        items: [
          { productId: drillId, quantity: 1 },
          { productId: drillId, quantity: 3 },
        ],
        address: 'г. Москва, ул. Воронцовская, д. 6а, стр. 1',
        phone: '+7 (916) 100-20-30',
      },
      customer,
    );

    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(4);
  });

  it('отказывает в оформлении при нехватке товара на складе', () => {
    expect(() =>
      orders.create(
        {
          items: [{ productId: drillId, quantity: 999 }],
          address: 'г. Москва, ул. Воронцовская, д. 6а, стр. 1',
          phone: '+7 (916) 100-20-30',
        },
        customer,
      ),
    ).toThrow(ConflictException);
  });

  it('возвращает товар на склад при отмене заказа', () => {
    const stockBefore = products.findById(drillId).stock;

    const order = orders.create(
      {
        items: [{ productId: drillId, quantity: 2 }],
        address: 'г. Москва, ул. Воронцовская, д. 6а, стр. 1',
        phone: '+7 (916) 100-20-30',
      },
      customer,
    );

    orders.cancel(order.id, customer);

    expect(products.findById(drillId).stock).toBe(stockBefore);
  });

  it('запрещает недопустимый переход статуса', () => {
    const completed = database.orders.findOne((o) => o.status === OrderStatus.Completed);

    expect(() => orders.changeStatus(completed!.id, OrderStatus.New)).toThrow(ConflictException);
  });

  it('показывает покупателю только его собственные заказы', () => {
    const visible = orders.findAll({}, customer);

    expect(visible.every((order) => order.customerId === customer.id)).toBe(true);
  });
});
