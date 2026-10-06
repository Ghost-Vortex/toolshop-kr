import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryDatabase } from '../../database/in-memory.database';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ProductsService } from '../products/products.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';

/**
 * Сервис отзывов. Покупатель может оставить не более одного отзыва
 * на каждый товар; удалять отзывы вправе их автор и сотрудники магазина.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly database: InMemoryDatabase,
    private readonly productsService: ProductsService,
  ) {}

  /** Отзывы о конкретном товаре, новые — первыми */
  findByProduct(productId: string): Review[] {
    this.productsService.getOrFail(productId);
    return this.database.reviews
      .findBy((review) => review.productId === productId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Публикация отзыва */
  create(dto: CreateReviewDto, author: AuthUser): Review {
    this.productsService.getOrFail(dto.productId);

    const alreadyReviewed = this.database.reviews.exists(
      (review) => review.productId === dto.productId && review.authorId === author.id,
    );

    if (alreadyReviewed) {
      throw new ConflictException('Вы уже оставляли отзыв на этот товар');
    }

    return this.database.reviews.create({
      productId: dto.productId,
      authorId: author.id,
      authorName: author.name,
      rating: dto.rating,
      text: dto.text,
    });
  }

  /** Удаление отзыва автором либо сотрудником магазина */
  remove(id: string, actor: AuthUser): void {
    const review = this.database.reviews.findById(id);

    if (!review) {
      throw new NotFoundException(`Отзыв с идентификатором ${id} не найден`);
    }

    const isStaff = actor.role === Role.Admin || actor.role === Role.Manager;

    if (!isStaff && review.authorId !== actor.id) {
      throw new ForbiddenException('Удалить можно только собственный отзыв');
    }

    this.database.reviews.remove(id);
  }
}
