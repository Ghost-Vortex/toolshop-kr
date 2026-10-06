import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser, JwtPayload } from '../interfaces/auth-user.interface';

/**
 * Гвард аутентификации. Проверяет JWT-токен из заголовка Authorization
 * и помещает распознанного пользователя в request.user.
 * Маршруты, помеченные декоратором @Public(), пропускаются без проверки,
 * но токен, если он передан, всё равно разбирается — это позволяет
 * контроллерам отдавать расширенный ответ авторизованному клиенту.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Требуется авторизация: отсутствует токен доступа');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
      (request as Request & { user?: AuthUser }).user = user;
      return true;
    } catch {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Токен доступа недействителен или истёк');
    }
  }

  /** Извлекает токен из заголовка вида «Authorization: Bearer <token>» */
  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) {
      return undefined;
    }
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
