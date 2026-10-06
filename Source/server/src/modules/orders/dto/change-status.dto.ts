import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum';

/** Данные для смены статуса заказа */
export class ChangeStatusDto {
  @ApiProperty({ description: 'Новый статус заказа', enum: OrderStatus })
  @IsEnum(OrderStatus, {
    message: `Поле status должно принимать одно из значений: ${Object.values(OrderStatus).join(', ')}`,
  })
  status: OrderStatus;
}
