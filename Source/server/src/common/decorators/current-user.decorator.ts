import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../interfaces/auth-user.interface';

/**
 * Декоратор параметра, который достаёт текущего пользователя из запроса.
 * Пользователя кладёт в запрос гвард JwtAuthGuard.
 * Пример: findMine(@CurrentUser() user: AuthUser)
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as AuthUser;
});
