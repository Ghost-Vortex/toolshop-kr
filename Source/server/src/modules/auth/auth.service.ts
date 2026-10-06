import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';
import { Role } from '../../common/enums/role.enum';
import { AuthUser, JwtPayload } from '../../common/interfaces/auth-user.interface';
import { UsersService } from '../users/users.service';
import { toUserResponse } from '../users/dto/user-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Сервис аутентификации. Проверяет учётные данные и выпускает
 * токены доступа формата JWT, используемые клиентской частью.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Регистрация нового покупателя с последующим автоматическим входом */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const created = this.usersService.create(dto, Role.Customer);
    return this.issueToken({
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
    });
  }

  /** Вход по адресу электронной почты и паролю */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = this.usersService.findEntityByEmail(dto.email);

    if (!user || !user.passwordHash || !compareSync(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Неверный адрес электронной почты или пароль');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Учётная запись заблокирована');
    }

    return this.issueToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }

  /** Данные текущего пользователя по его токену */
  profile(current: AuthUser) {
    return toUserResponse(this.usersService.getOrFail(current.id));
  }

  /** Формирует подписанный токен доступа для указанного пользователя */
  private async issueToken(user: AuthUser): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '2h'),
      user: toUserResponse(this.usersService.getOrFail(user.id)),
    };
  }
}
