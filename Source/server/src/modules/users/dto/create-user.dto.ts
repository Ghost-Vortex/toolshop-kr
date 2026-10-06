import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Данные для создания пользователя.
 * Обязательны имя и адрес электронной почты; возраст указывается по желанию.
 * Проверка выполняется библиотекой class-validator в глобальном ValidationPipe.
 */
export class CreateUserDto {
  @ApiProperty({ description: 'Имя пользователя', example: 'Ковалёв Сергей Петрович' })
  @IsString({ message: 'Поле name должно быть строкой' })
  @IsNotEmpty({ message: 'Поле name обязательно для заполнения' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 100, { message: 'Имя должно содержать от 2 до 100 символов' })
  name: string;

  @ApiProperty({ description: 'Адрес электронной почты', example: 'user@example.com' })
  @IsEmail({}, { message: 'Поле email должно быть корректным адресом электронной почты' })
  @IsNotEmpty({ message: 'Поле email обязательно для заполнения' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @ApiPropertyOptional({ description: 'Возраст, полных лет', example: 42, minimum: 14, maximum: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Поле age должно быть целым числом' })
  @Min(14, { message: 'Возраст не может быть меньше 14 лет' })
  @Max(120, { message: 'Возраст не может превышать 120 лет' })
  age?: number;

  @ApiPropertyOptional({
    description: 'Пароль для входа в систему. Если не указан, учётная запись создаётся без доступа',
    example: 'customer12345',
    minLength: 8,
  })
  @IsOptional()
  @IsString({ message: 'Поле password должно быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать не менее 8 символов' })
  @MaxLength(72, { message: 'Пароль не может быть длиннее 72 символов' })
  password?: string;
}
