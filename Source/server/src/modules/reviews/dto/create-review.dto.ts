import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsUUID, Length, Max, Min } from 'class-validator';

/** Данные для публикации отзыва о товаре */
export class CreateReviewDto {
  @ApiProperty({ description: 'Идентификатор товара (UUID)' })
  @IsUUID('4', { message: 'Поле productId должно быть идентификатором формата UUID версии 4' })
  productId: string;

  @ApiProperty({ description: 'Оценка по пятибалльной шкале', example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt({ message: 'Оценка должна быть целым числом' })
  @Min(1, { message: 'Оценка не может быть меньше 1' })
  @Max(5, { message: 'Оценка не может быть больше 5' })
  rating: number;

  @ApiProperty({ description: 'Текст отзыва', example: 'Инструмент полностью соответствует описанию.' })
  @IsString({ message: 'Поле text должно быть строкой' })
  @IsNotEmpty({ message: 'Поле text обязательно для заполнения' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(10, 500, { message: 'Отзыв должен содержать от 10 до 500 символов' })
  text: string;
}
