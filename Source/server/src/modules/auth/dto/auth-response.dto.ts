import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/** Результат успешной аутентификации */
export class AuthResponseDto {
  @ApiProperty({ description: 'Токен доступа в формате JWT' })
  accessToken: string;

  @ApiProperty({ description: 'Срок действия токена' })
  expiresIn: string;

  @ApiProperty({ description: 'Данные вошедшего пользователя', type: UserResponseDto })
  user: UserResponseDto;
}
