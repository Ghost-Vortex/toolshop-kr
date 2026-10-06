import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum';

/** Параметры фильтрации списка заказов */
export class OrderQueryDto {
  @ApiPropertyOptional({ description: 'Фильтр по статусу', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: `Параметр status должен принимать одно из значений: ${Object.values(OrderStatus).join(', ')}`,
  })
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Фильтр по покупателю (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'Параметр customerId должен быть идентификатором формата UUID версии 4' })
  customerId?: string;
}
