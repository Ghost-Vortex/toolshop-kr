import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';
import { User } from '../entities/user.entity';

/**
 * Представление пользователя, безопасное для передачи клиенту:
 * хеш пароля в ответ не попадает.
 */
export class UserResponseDto {
  @ApiProperty({ description: 'Уникальный идентификатор (UUID версии 4)' })
  id: string;

  @ApiProperty({ description: 'Имя пользователя' })
  name: string;

  @ApiProperty({ description: 'Адрес электронной почты' })
  email: string;

  @ApiPropertyOptional({ description: 'Возраст, полных лет' })
  age?: number;

  @ApiProperty({ description: 'Категория пользователя', enum: Role })
  role: Role;

  @ApiProperty({ description: 'Дата и время создания записи' })
  createdAt: string;

  @ApiProperty({ description: 'Дата и время последнего изменения записи' })
  updatedAt: string;
}

/** Преобразует хранимую сущность в ответ API, отбрасывая служебные поля */
export function toUserResponse(user: User): UserResponseDto {
  const { passwordHash, isActive, ...safe } = user;
  return safe;
}
