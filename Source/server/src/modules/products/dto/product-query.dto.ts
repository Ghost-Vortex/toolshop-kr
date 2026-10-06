import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Способы упорядочивания каталога */
export enum ProductSort {
  PriceAsc = 'price_asc',
  PriceDesc = 'price_desc',
  NameAsc = 'name_asc',
  RatingDesc = 'rating_desc',
}

/** Параметры фильтрации и сортировки каталога товаров */
export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Строка поиска по наименованию, артикулу и производителю' })
  @IsOptional()
  @IsString({ message: 'Параметр search должен быть строкой' })
  @MaxLength(100, { message: 'Строка поиска не может быть длиннее 100 символов' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: 'Идентификатор категории (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'Параметр categoryId должен быть идентификатором формата UUID версии 4' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Минимальная цена' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Параметр minPrice должен быть числом' })
  @Min(0, { message: 'Минимальная цена не может быть отрицательной' })
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Максимальная цена' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Параметр maxPrice должен быть числом' })
  @Min(0, { message: 'Максимальная цена не может быть отрицательной' })
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Показывать только товары в наличии' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: 'Параметр inStock должен быть логическим значением' })
  inStock?: boolean;

  @ApiPropertyOptional({ description: 'Порядок сортировки', enum: ProductSort })
  @IsOptional()
  @IsEnum(ProductSort, { message: `Параметр sort должен принимать одно из значений: ${Object.values(ProductSort).join(', ')}` })
  sort?: ProductSort;
}
