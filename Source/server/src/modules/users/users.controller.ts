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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ChangeRoleDto } from './dto/change-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

/**
 * Контроллер пользователей.
 * Реализует три обязательных эндпоинта технического задания
 * (GET /users, GET /users/:id, POST /users) и дополнительные операции
 * администрирования, защищённые проверкой роли.
 */
@ApiTags('Пользователи')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Получение списка всех пользователей' })
  @ApiOkResponse({ description: 'Список пользователей', type: [UserResponseDto] })
  findAll(): UserResponseDto[] {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Получение пользователя по идентификатору' })
  @ApiParam({ name: 'id', description: 'Идентификатор пользователя (UUID)' })
  @ApiOkResponse({ description: 'Найденный пользователь', type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): UserResponseDto {
    return this.usersService.findById(id);
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание нового пользователя' })
  @ApiCreatedResponse({ description: 'Пользователь создан', type: UserResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Данные не прошли проверку' })
  @ApiConflictResponse({ description: 'Адрес электронной почты уже занят' })
  create(@Body() dto: CreateUserDto): UserResponseDto {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Изменение данных пользователя (владельцем или администратором)' })
  @ApiOkResponse({ description: 'Обновлённый пользователь', type: UserResponseDto })
  @ApiForbiddenResponse({ description: 'Недостаточно прав' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ): UserResponseDto {
    return this.usersService.update(id, dto, actor);
  }

  @Patch(':id/role')
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Смена категории (роли) пользователя' })
  @ApiOkResponse({ description: 'Пользователь с новой ролью', type: UserResponseDto })
  @ApiForbiddenResponse({ description: 'Операция доступна только администратору' })
  changeRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ChangeRoleDto,
  ): UserResponseDto {
    return this.usersService.changeRole(id, dto.role);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удаление пользователя' })
  @ApiNoContentResponse({ description: 'Пользователь удалён' })
  @ApiConflictResponse({ description: 'Удаление невозможно из-за связанных записей' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    this.usersService.remove(id);
  }
}
