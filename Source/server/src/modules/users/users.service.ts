import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import { InMemoryDatabase } from '../../database/in-memory.database';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto, toUserResponse } from './dto/user-response.dto';
import { User } from './entities/user.entity';

/** Стоимость хеширования пароля (количество раундов алгоритма bcrypt) */
const SALT_ROUNDS = 10;

/**
 * Сервис пользователей. Содержит бизнес-логику работы с учётными записями
 * и не зависит от транспортного уровня: контроллер лишь передаёт ему
 * проверенные данные и получает результат.
 */
@Injectable()
export class UsersService {
  constructor(private readonly database: InMemoryDatabase) {}

  /** Возвращает список всех пользователей */
  findAll(): UserResponseDto[] {
    return this.database.users.findAll().map(toUserResponse);
  }

  /** Возвращает пользователя по идентификатору */
  findById(id: string): UserResponseDto {
    return toUserResponse(this.getOrFail(id));
  }

  /**
   * Создаёт пользователя.
   * Адрес электронной почты должен быть уникальным, иначе выбрасывается
   * исключение с кодом 409 Conflict.
   */
  create(dto: CreateUserDto, role: Role = Role.Customer): UserResponseDto {
    const email = UsersService.normalizeEmail(dto.email);
    this.assertEmailIsFree(email);

    const user = this.database.users.create({
      name: dto.name,
      email,
      age: dto.age,
      role,
      passwordHash: dto.password ? hashSync(dto.password, SALT_ROUNDS) : undefined,
      isActive: true,
    });

    return toUserResponse(user);
  }

  /**
   * Обновляет данные пользователя.
   * Изменить запись может её владелец либо администратор.
   */
  update(id: string, dto: UpdateUserDto, actor: AuthUser): UserResponseDto {
    const user = this.getOrFail(id);

    if (actor.role !== Role.Admin && actor.id !== user.id) {
      throw new ForbiddenException('Изменять можно только собственную учётную запись');
    }

    const changes = { ...dto };

    if (changes.email) {
      changes.email = UsersService.normalizeEmail(changes.email);
      if (changes.email !== user.email) {
        this.assertEmailIsFree(changes.email);
      }
    }

    return toUserResponse(this.database.users.update(id, changes) as User);
  }

  /** Изменяет категорию (роль) пользователя; доступно администратору */
  changeRole(id: string, role: Role): UserResponseDto {
    const user = this.getOrFail(id);

    if (user.role === Role.Admin && role !== Role.Admin && this.countAdmins() === 1) {
      throw new ConflictException('В системе должен остаться хотя бы один администратор');
    }

    return toUserResponse(this.database.users.update(id, { role }) as User);
  }

  /** Удаляет пользователя вместе с его отзывами */
  remove(id: string): void {
    const user = this.getOrFail(id);

    if (user.role === Role.Admin && this.countAdmins() === 1) {
      throw new ConflictException('Нельзя удалить единственного администратора');
    }

    if (this.database.orders.exists((order) => order.customerId === id)) {
      throw new ConflictException('Нельзя удалить пользователя, у которого есть оформленные заказы');
    }

    this.database.reviews
      .findBy((review) => review.authorId === id)
      .forEach((review) => this.database.reviews.remove(review.id));

    this.database.users.remove(id);
  }

  /** Возвращает хранимую сущность по адресу электронной почты (используется при входе) */
  findEntityByEmail(email: string): User | undefined {
    const normalized = UsersService.normalizeEmail(email);
    return this.database.users.findOne((user) => user.email === normalized);
  }

  /** Возвращает хранимую сущность по идентификатору либо выбрасывает 404 */
  getOrFail(id: string): User {
    const user = this.database.users.findById(id);
    if (!user) {
      throw new NotFoundException(`Пользователь с идентификатором ${id} не найден`);
    }
    return user;
  }

  /**
   * Приводит адрес электронной почты к каноническому виду.
   * Адреса нечувствительны к регистру, поэтому в хранилище попадает
   * только строчное написание — иначе одного и того же пользователя
   * можно было бы зарегистрировать дважды.
   */
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /** Проверяет, что адрес электронной почты ещё не занят */
  private assertEmailIsFree(email: string): void {
    const normalized = UsersService.normalizeEmail(email);
    if (this.database.users.exists((user) => user.email === normalized)) {
      throw new ConflictException(`Пользователь с адресом ${normalized} уже зарегистрирован`);
    }
  }

  /** Количество администраторов в системе */
  private countAdmins(): number {
    return this.database.users.findBy((user) => user.role === Role.Admin).length;
  }
}
