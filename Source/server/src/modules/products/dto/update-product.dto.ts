import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/** Данные для частичного обновления карточки товара */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
