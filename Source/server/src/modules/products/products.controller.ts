import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductView, ProductsService } from './products.service';

/**
 * Контроллер каталога товаров.
 * Просмотр каталога открыт всем, изменение — менеджеру и администратору.
 */
@ApiTags('Товары')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Каталог товаров с фильтрацией и постраничным выводом' })
  @ApiOkResponse({ description: 'Страница каталога' })
  findAll(@Query() query: ProductQueryDto): PaginatedResult<ProductView> {
    return this.productsService.findAll(query);
  }

  @Get('management')
  @Roles(Role.Admin, Role.Manager)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Полный список товаров, включая архивные' })
  findAllForManagement(): ProductView[] {
    return this.productsService.findAllForManagement();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Карточка товара' })
  @ApiNotFoundResponse({ description: 'Товар не найден' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): ProductView {
    return this.productsService.findById(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Manager)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавление товара в каталог' })
  @ApiCreatedResponse({ description: 'Товар создан' })
  @ApiConflictResponse({ description: 'Артикул уже используется' })
  create(@Body() dto: CreateProductDto): ProductView {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Manager)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Изменение карточки товара' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProductDto,
  ): ProductView {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Manager)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удаление товара (при наличии заказов — перевод в архив)' })
  @ApiOkResponse({ description: 'Признак того, что товар переведён в архив' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): { archived: boolean } {
    return this.productsService.remove(id);
  }
}
