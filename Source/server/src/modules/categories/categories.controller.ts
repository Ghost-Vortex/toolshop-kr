import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CategoriesService, CategoryWithCount } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

/**
 * Контроллер категорий. Чтение открыто всем посетителям,
 * изменение доступно менеджеру и администратору.
 */
@ApiTags('Категории')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Список категорий каталога' })
  @ApiOkResponse({ description: 'Категории с количеством товаров' })
  findAll(): CategoryWithCount[] {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Категория по идентификатору' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Category {
    return this.categoriesService.findById(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Manager)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создание категории' })
  @ApiCreatedResponse({ description: 'Категория создана' })
  @ApiConflictResponse({ description: 'Символьный код уже занят' })
  create(@Body() dto: CreateCategoryDto): Category {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Manager)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Изменение категории' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Category {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Manager)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удаление категории' })
  @ApiNoContentResponse({ description: 'Категория удалена' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    this.categoriesService.remove(id);
  }
}
