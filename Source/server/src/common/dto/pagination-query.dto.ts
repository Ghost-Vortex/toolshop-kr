import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Базовые параметры постраничного вывода, наследуются конкретными фильтрами */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Номер страницы, начиная с 1', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Параметр page должен быть целым числом' })
  @Min(1, { message: 'Параметр page не может быть меньше 1' })
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ description: 'Количество записей на странице', default: 12, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: 'Параметр limit должен быть целым числом' })
  @Min(1, { message: 'Параметр limit не может быть меньше 1' })
  @Max(100, { message: 'Параметр limit не может превышать 100' })
  @IsOptional()
  limit: number = 12;
}
