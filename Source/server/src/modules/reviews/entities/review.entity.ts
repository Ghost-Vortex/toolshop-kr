import { BaseEntity } from '../../../database/base.entity';

/** Отзыв покупателя о товаре */
export interface Review extends BaseEntity {
  productId: string;
  authorId: string;
  authorName: string;
  /** Оценка по пятибалльной шкале */
  rating: number;
  text: string;
}
