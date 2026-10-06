import { Role } from '../enums/role.enum';

/** Данные пользователя, восстановленные из JWT-токена */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Полезная нагрузка (payload) JWT-токена */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}
