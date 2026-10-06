import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { Order } from './entities/order.entity';
import { OrdersService, OrdersSummary } from './orders.service';

/**
 * Контроллер заказов. Все операции требуют авторизации;
 * состав доступных данных зависит от категории пользователя.
 */
@ApiTags('Заказы')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Список заказов (покупателю — только собственные)' })
  @ApiOkResponse({ description: 'Список заказов' })
  findAll(@Query() query: OrderQueryDto, @CurrentUser() actor: AuthUser): Order[] {
    return this.ordersService.findAll(query, actor);
  }

  @Get('summary')
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: 'Сводная статистика по заказам' })
  @ApiForbiddenResponse({ description: 'Операция доступна сотрудникам магазина' })
  summary(): OrdersSummary {
    return this.ordersService.summary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Заказ по идентификатору' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthUser,
  ): Order {
    return this.ordersService.findById(id, actor);
  }

  @Post()
  @Roles(Role.Customer, Role.Admin)
  @ApiOperation({ summary: 'Оформление заказа' })
  @ApiCreatedResponse({ description: 'Заказ оформлен' })
  @ApiConflictResponse({ description: 'Недостаточно товара на складе' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() customer: AuthUser): Order {
    return this.ordersService.create(dto, customer);
  }

  @Patch(':id/status')
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: 'Смена статуса заказа сотрудником магазина' })
  @ApiConflictResponse({ description: 'Недопустимый переход статуса' })
  changeStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ChangeStatusDto,
  ): Order {
    return this.ordersService.changeStatus(id, dto.status);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Отмена заказа покупателем' })
  cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthUser,
  ): Order {
    return this.ordersService.cancel(id, actor);
  }
}
