import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/** Учётные данные для входа в систему */
export class LoginDto {
  @ApiProperty({ description: 'Адрес электронной почты', example: 'admin@toolshop.ru' })
  @IsEmail({}, { message: 'Поле email должно быть корректным адресом электронной почты' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @ApiProperty({ description: 'Пароль', example: 'admin12345' })
  @IsString({ message: 'Поле password должно быть строкой' })
  @IsNotEmpty({ message: 'Поле password обязательно для заполнения' })
  @MinLength(8, { message: 'Пароль должен содержать не менее 8 символов' })
  password: string;
}
