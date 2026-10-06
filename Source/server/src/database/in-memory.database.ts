import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InMemoryRepository } from './in-memory.repository';
import { User } from '../modules/users/entities/user.entity';
import { Category } from '../modules/categories/entities/category.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Order } from '../modules/orders/entities/order.entity';
import { Review } from '../modules/reviews/entities/review.entity';
import { seedDatabase } from './seed';

/**
 * Источник данных приложения. Играет роль, которую в промышленной версии
 * выполняет СУБД: агрегирует репозитории всех сущностей и выполняет
 * начальное заполнение при старте приложения.
 *
 * Класс зарегистрирован как провайдер в глобальном модуле DatabaseModule,
 * поэтому единственный его экземпляр внедряется во все сервисы через
 * механизм внедрения зависимостей (DI) NestJS.
 */
@Injectable()
export class InMemoryDatabase implements OnModuleInit {
  private readonly logger = new Logger(InMemoryDatabase.name);

  readonly users = new InMemoryRepository<User>('users');
  readonly categories = new InMemoryRepository<Category>('categories');
  readonly products = new InMemoryRepository<Product>('products');
  readonly orders = new InMemoryRepository<Order>('orders');
  readonly reviews = new InMemoryRepository<Review>('reviews');

  /** Вызывается NestJS после инициализации модуля */
  onModuleInit(): void {
    seedDatabase(this);
    this.logger.log(
      `Источник данных подготовлен: ${this.describe()
        .map((row) => `${row.entity}=${row.records}`)
        .join(', ')}`,
    );
  }

  /** Сводка по количеству записей — используется эндпоинтом /health */
  describe(): Array<{ entity: string; records: number }> {
    return [this.users, this.categories, this.products, this.orders, this.reviews].map(
      (repository) => ({ entity: repository.name, records: repository.size }),
    );
  }

  /** Полная очистка источника данных (используется в автотестах) */
  reset(): void {
    this.users.clear();
    this.categories.clear();
    this.products.clear();
    this.orders.clear();
    this.reviews.clear();
    seedDatabase(this);
  }
}
