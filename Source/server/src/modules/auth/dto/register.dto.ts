import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';

/**
 * Данные для самостоятельной регистрации покупателя.
 * Отличается от CreateUserDto обязательностью пароля.
 */
export class RegisterDto extends CreateUserDto {
  @ApiProperty({ description: 'Пароль для входа в систему', example: 'customer12345', minLength: 8 })
  @IsString({ message: 'Поле password должно быть строкой' })
  @IsNotEmpty({ message: 'Поле password обязательно для заполнения' })
  @MinLength(8, { message: 'Пароль должен содержать не менее 8 символов' })
  @MaxLength(72, { message: 'Пароль не может быть длиннее 72 символов' })
  password: string;
}
