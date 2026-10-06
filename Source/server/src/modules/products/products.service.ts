import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryDatabase } from '../../database/in-memory.database';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

/** Карточка товара, дополненная сведениями о категории и отзывах */
export interface ProductView extends Product {
  categoryName: string;
  rating: number;
  reviewsCount: number;
}

/**
 * Сервис каталога товаров. Отвечает за выборку с фильтрацией,
 * сортировкой и постраничным выводом, а также за операции CRUD.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly database: InMemoryDatabase,
    private readonly categoriesService: CategoriesService,
  ) {}

  /** Каталог товаров с учётом переданных фильтров */
  findAll(query: ProductQueryDto): PaginatedResult<ProductView> {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      throw new BadRequestException('Минимальная цена не может превышать максимальную');
    }

    const search = query.search?.toLowerCase();

    const filtered = this.database.products.findBy((product) => {
      if (product.isArchived) {
        return false;
      }
      if (query.categoryId && product.categoryId !== query.categoryId) {
        return false;
      }
      if (query.minPrice !== undefined && product.price < query.minPrice) {
        return false;
      }
      if (query.maxPrice !== undefined && product.price > query.maxPrice) {
        return false;
      }
      if (query.inStock && product.stock <= 0) {
        return false;
      }
      if (search) {
        const haystack = `${product.name} ${product.sku} ${product.brand}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }
      return true;
    });

    const views = filtered.map((product) => this.toView(product));
    const sorted = this.sort(views, query.sort);

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const offset = (page - 1) * limit;

    return {
      items: sorted.slice(offset, offset + limit),
      total: sorted.length,
      page,
      limit,
      pages: Math.max(1, Math.ceil(sorted.length / limit)),
    };
  }

  /** Полный список товаров, включая снятые с продажи (для панели управления) */
  findAllForManagement(): ProductView[] {
    return this.database.products.findAll().map((product) => this.toView(product));
  }

  /** Карточка товара по идентификатору */
  findById(id: string): ProductView {
    return this.toView(this.getOrFail(id));
  }

  /** Создание карточки товара */
  create(dto: CreateProductDto): ProductView {
    this.categoriesService.getOrFail(dto.categoryId);
    this.assertSkuIsFree(dto.sku);

    const product = this.database.products.create({
      name: dto.name,
      sku: dto.sku,
      description: dto.description ?? '',
      price: dto.price,
      stock: dto.stock,
      brand: dto.brand,
      categoryId: dto.categoryId,
      image: dto.image ?? '',
      isArchived: dto.isArchived ?? false,
    });

    return this.toView(product);
  }

  /** Частичное обновление карточки товара */
  update(id: string, dto: UpdateProductDto): ProductView {
    const product = this.getOrFail(id);

    if (dto.categoryId) {
      this.categoriesService.getOrFail(dto.categoryId);
    }
    if (dto.sku && dto.sku !== product.sku) {
      this.assertSkuIsFree(dto.sku);
    }

    return this.toView(this.database.products.update(id, dto) as Product);
  }

  /**
   * Удаление товара. Если товар встречается в оформленных заказах,
   * он не удаляется, а переводится в архив — так сохраняется история продаж.
   */
  remove(id: string): { archived: boolean } {
    this.getOrFail(id);

    const usedInOrders = this.database.orders.exists((order) =>
      order.items.some((item) => item.productId === id),
    );

    if (usedInOrders) {
      this.database.products.update(id, { isArchived: true });
      return { archived: true };
    }

    this.database.reviews
      .findBy((review) => review.productId === id)
      .forEach((review) => this.database.reviews.remove(review.id));

    this.database.products.remove(id);
    return { archived: false };
  }

  /** Уменьшает остаток на складе при оформлении заказа */
  decreaseStock(id: string, quantity: number): void {
    const product = this.getOrFail(id);

    if (product.stock < quantity) {
      throw new ConflictException(
        `Недостаточно товара «${product.name}» на складе: доступно ${product.stock} шт.`,
      );
    }

    this.database.products.update(id, { stock: product.stock - quantity });
  }

  /** Возвращает остаток на склад при отмене заказа */
  increaseStock(id: string, quantity: number): void {
    const product = this.database.products.findById(id);
    if (product) {
      this.database.products.update(id, { stock: product.stock + quantity });
    }
  }

  /** Возвращает товар либо выбрасывает 404 */
  getOrFail(id: string): Product {
    const product = this.database.products.findById(id);
    if (!product) {
      throw new NotFoundException(`Товар с идентификатором ${id} не найден`);
    }
    return product;
  }

  /** Дополняет товар названием категории и агрегатами по отзывам */
  private toView(product: Product): ProductView {
    const reviews = this.database.reviews.findBy((review) => review.productId === product.id);
    const rating = reviews.length
      ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
      : 0;

    return {
      ...product,
      categoryName: this.database.categories.findById(product.categoryId)?.name ?? 'Без категории',
      rating,
      reviewsCount: reviews.length,
    };
  }

  /** Упорядочивает выборку в соответствии с параметром sort */
  private sort(items: ProductView[], sort?: ProductSort): ProductView[] {
    const sorted = [...items];

    switch (sort) {
      case ProductSort.PriceAsc:
        return sorted.sort((a, b) => a.price - b.price);
      case ProductSort.PriceDesc:
        return sorted.sort((a, b) => b.price - a.price);
      case ProductSort.RatingDesc:
        return sorted.sort((a, b) => b.rating - a.rating);
      case ProductSort.NameAsc:
      default:
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    }
  }

  /** Проверяет уникальность артикула */
  private assertSkuIsFree(sku: string): void {
    if (this.database.products.exists((product) => product.sku === sku)) {
      throw new ConflictException(`Товар с артикулом ${sku} уже существует`);
    }
  }
}
