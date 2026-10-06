import { BaseEntity } from '../../../database/base.entity';

/** Категория инструмента (например, «Электроинструмент») */
export interface Category extends BaseEntity {
  name: string;
  slug: string;
  description: string;
}
