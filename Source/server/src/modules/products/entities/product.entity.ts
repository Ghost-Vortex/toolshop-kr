import { BaseEntity } from '../../../database/base.entity';

/** Товар — единица номенклатуры интернет-магазина инструментов */
export interface Product extends BaseEntity {
  name: string;
  /** Артикул производителя */
  sku: string;
  description: string;
  /** Цена в рублях */
  price: number;
  /** Остаток на складе, шт. */
  stock: number;
  brand: string;
  categoryId: string;
  /** Имя файла фотографии товара; пустая строка — фотографии нет */
  image: string;
  /** Признак снятия товара с продажи */
  isArchived: boolean;
}
