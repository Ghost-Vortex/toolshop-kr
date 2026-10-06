import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryDatabase } from '../../database/in-memory.database';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

/** Категория с рассчитанным количеством товаров */
export interface CategoryWithCount extends Category {
  productsCount: number;
}

/** Сервис категорий каталога */
@Injectable()
export class CategoriesService {
  constructor(private readonly database: InMemoryDatabase) {}

  /** Список категорий с количеством активных товаров в каждой */
  findAll(): CategoryWithCount[] {
    return this.database.categories.findAll().map((category) => ({
      ...category,
      productsCount: this.database.products.findBy(
        (product) => product.categoryId === category.id && !product.isArchived,
      ).length,
    }));
  }

  /** Категория по идентификатору */
  findById(id: string): Category {
    return this.getOrFail(id);
  }

  /** Создание категории; символьный код должен быть уникальным */
  create(dto: CreateCategoryDto): Category {
    this.assertSlugIsFree(dto.slug);
    return this.database.categories.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? '',
    });
  }

  /** Частичное обновление категории */
  update(id: string, dto: UpdateCategoryDto): Category {
    const category = this.getOrFail(id);
    if (dto.slug && dto.slug !== category.slug) {
      this.assertSlugIsFree(dto.slug);
    }
    return this.database.categories.update(id, dto) as Category;
  }

  /** Удаление категории; запрещено, если к ней привязаны товары */
  remove(id: string): void {
    this.getOrFail(id);

    if (this.database.products.exists((product) => product.categoryId === id)) {
      throw new ConflictException('Нельзя удалить категорию, к которой привязаны товары');
    }

    this.database.categories.remove(id);
  }

  /** Возвращает категорию либо выбрасывает 404 */
  getOrFail(id: string): Category {
    const category = this.database.categories.findById(id);
    if (!category) {
      throw new NotFoundException(`Категория с идентификатором ${id} не найдена`);
    }
    return category;
  }

  /** Проверяет уникальность символьного кода */
  private assertSlugIsFree(slug: string): void {
    if (this.database.categories.exists((category) => category.slug === slug)) {
      throw new ConflictException(`Категория с символьным кодом ${slug} уже существует`);
    }
  }
}
