import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Позиция оформляемого заказа */
export class CreateOrderItemDto {
  @ApiProperty({ description: 'Идентификатор товара (UUID)' })
  @IsUUID('4', { message: 'Поле productId должно быть идентификатором формата UUID версии 4' })
  productId: string;

  @ApiProperty({ description: 'Количество, шт.', example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Количество должно быть целым числом' })
  @Min(1, { message: 'Количество не может быть меньше 1' })
  @Max(100, { message: 'Количество в одной позиции не может превышать 100' })
  quantity: number;
}

/** Данные для оформления заказа */
export class CreateOrderDto {
  @ApiProperty({ description: 'Состав заказа', type: [CreateOrderItemDto] })
  @IsArray({ message: 'Поле items должно быть массивом' })
  @ArrayMinSize(1, { message: 'Заказ должен содержать хотя бы одну позицию' })
  @ArrayMaxSize(50, { message: 'Заказ не может содержать более 50 позиций' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ description: 'Адрес доставки', example: 'г. Москва, ул. Воронцовская, д. 6а, стр. 1' })
  @IsString({ message: 'Поле address должно быть строкой' })
  @IsNotEmpty({ message: 'Поле address обязательно для заполнения' })
  @Length(10, 200, { message: 'Адрес должен содержать от 10 до 200 символов' })
  address: string;

  @ApiProperty({ description: 'Контактный телефон', example: '+7 (916) 100-20-30' })
  @IsString({ message: 'Поле phone должно быть строкой' })
  @Matches(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/, {
    message: 'Телефон должен соответствовать формату +7 (XXX) XXX-XX-XX',
  })
  phone: string;

  @ApiPropertyOptional({ description: 'Комментарий к заказу' })
  @IsOptional()
  @IsString({ message: 'Поле comment должно быть строкой' })
  @MaxLength(300, { message: 'Комментарий не может быть длиннее 300 символов' })
  comment?: string;
}
