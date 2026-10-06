import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/** Данные для частичного обновления категории */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
