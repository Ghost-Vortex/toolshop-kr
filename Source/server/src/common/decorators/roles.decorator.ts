import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { Role } from '../enums/role.enum';

/** Ключ метаданных, по которому RolesGuard получает список разрешённых ролей */
export const ROLES_KEY = 'roles';

/**
 * Декоратор ограничения доступа к обработчику по категории пользователя.
 * Пример: @Roles(Role.Admin, Role.Manager)
 */
export const Roles = (...roles: Role[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
