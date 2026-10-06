import { BaseEntity } from '../../../database/base.entity';
import { Role } from '../../../common/enums/role.enum';

/**
 * Пользователь системы.
 * Поля name и email обязательны, age — необязательно (см. техническое задание).
 * Пароль хранится исключительно в виде хеша bcrypt и никогда не покидает сервер.
 */
export interface User extends BaseEntity {
  name: string;
  email: string;
  age?: number;
  role: Role;
  passwordHash?: string;
  /** Признак того, что учётная запись активна и может выполнять вход */
  isActive: boolean;
}
