import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

/** Данные для смены категории (роли) пользователя */
export class ChangeRoleDto {
  @ApiProperty({ description: 'Новая роль пользователя', enum: Role, example: Role.Manager })
  @IsEnum(Role, { message: `Поле role должно принимать одно из значений: ${Object.values(Role).join(', ')}` })
  role: Role;
}
