import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Данные для создания карточки товара */
export class CreateProductDto {
  @ApiProperty({ description: 'Наименование товара', example: 'Перфоратор SDS-Plus 850 Вт' })
  @IsString({ message: 'Поле name должно быть строкой' })
  @IsNotEmpty({ message: 'Поле name обязательно для заполнения' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(3, 120, { message: 'Наименование должно содержать от 3 до 120 символов' })
  name: string;

  @ApiProperty({ description: 'Артикул производителя', example: 'PWR-0850' })
  @IsString({ message: 'Поле sku должно быть строкой' })
  @Matches(/^[A-Z]{3}-[0-9]{4}$/, {
    message: 'Артикул должен соответствовать шаблону XXX-0000 (три заглавные латинские буквы и четыре цифры)',
  })
  sku: string;

  @ApiPropertyOptional({ description: 'Описание товара' })
  @IsOptional()
  @IsString({ message: 'Поле description должно быть строкой' })
  @MaxLength(1000, { message: 'Описание не может быть длиннее 1000 символов' })
  description?: string = '';

  @ApiProperty({ description: 'Цена в рублях', example: 8490, minimum: 1 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Цена должна быть числом с не более чем двумя знаками после запятой' })
  @Min(1, { message: 'Цена не может быть меньше 1 рубля' })
  @Max(1_000_000, { message: 'Цена не может превышать 1 000 000 рублей' })
  price: number;

  @ApiProperty({ description: 'Остаток на складе, шт.', example: 14, minimum: 0 })
  @Type(() => Number)
  @IsInt({ message: 'Остаток должен быть целым числом' })
  @Min(0, { message: 'Остаток не может быть отрицательным' })
  @Max(10_000, { message: 'Остаток не может превышать 10 000 единиц' })
  stock: number;

  @ApiProperty({ description: 'Производитель', example: 'Интерскол' })
  @IsString({ message: 'Поле brand должно быть строкой' })
  @IsNotEmpty({ message: 'Поле brand обязательно для заполнения' })
  @Length(2, 40, { message: 'Наименование производителя должно содержать от 2 до 40 символов' })
  brand: string;

  @ApiProperty({ description: 'Идентификатор категории (UUID)' })
  @IsUUID('4', { message: 'Поле categoryId должно быть идентификатором формата UUID версии 4' })
  categoryId: string;

  @ApiPropertyOptional({ description: 'Имя файла фотографии товара; пусто — фото нет', example: 'perforator.jpg' })
  @IsOptional()
  @IsString({ message: 'Поле image должно быть строкой' })
  @MaxLength(40, { message: 'Обозначение изображения не может быть длиннее 40 символов' })
  image?: string = '';

  @ApiPropertyOptional({ description: 'Товар снят с продажи', default: false })
  @IsOptional()
  @IsBoolean({ message: 'Поле isArchived должно быть логическим значением' })
  isArchived?: boolean = false;
}
