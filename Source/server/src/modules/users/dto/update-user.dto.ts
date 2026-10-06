import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

/**
 * Данные для изменения пользователя.
 * Все поля необязательные: клиент присылает только то, что меняет.
 * Пароль здесь не меняется.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Имя пользователя' })
  @IsOptional()
  @IsString({ message: 'Поле name должно быть строкой' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 100, { message: 'Имя должно содержать от 2 до 100 символов' })
  name?: string;

  @ApiPropertyOptional({ description: 'Адрес электронной почты' })
  @IsOptional()
  @IsEmail({}, { message: 'Поле email должно быть корректным адресом электронной почты' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email?: string;

  @ApiPropertyOptional({ description: 'Возраст, полных лет' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Поле age должно быть целым числом' })
  @Min(14, { message: 'Возраст не может быть меньше 14 лет' })
  @Max(120, { message: 'Возраст не может превышать 120 лет' })
  age?: number;
}
