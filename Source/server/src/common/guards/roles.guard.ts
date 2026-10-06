import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { AuthUser } from '../interfaces/auth-user.interface';

/**
 * Гвард авторизации. Сравнивает роль текущего пользователя со списком ролей,
 * заданным декоратором @Roles() на уровне метода или контроллера.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Действие доступно только авторизованным пользователям');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Недостаточно прав: требуется одна из ролей [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
