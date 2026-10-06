import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryDatabase } from '../../database/in-memory.database';
import { Role } from '../../common/enums/role.enum';
import { UsersService } from './users.service';

/**
 * Модульные тесты сервиса пользователей.
 * Источник данных создаётся заново перед каждым тестом, поэтому
 * тесты не влияют друг на друга.
 */
describe('UsersService', () => {
  let service: UsersService;
  let database: InMemoryDatabase;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [UsersService, InMemoryDatabase],
    }).compile();

    database = moduleRef.get(InMemoryDatabase);
    database.onModuleInit();
    service = moduleRef.get(UsersService);
  });

  it('возвращает список предварительно загруженных пользователей', () => {
    const users = service.findAll();

    expect(users).toHaveLength(4);
    expect(users.every((user) => !('passwordHash' in user))).toBe(true);
  });

  it('создаёт пользователя с ролью «покупатель» по умолчанию', () => {
    const created = service.create({
      name: 'Новиков Пётр Ильич',
      email: 'Novikov@Example.COM',
      age: 28,
    });

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.role).toBe(Role.Customer);
    expect(created.email).toBe('novikov@example.com');
    expect(service.findAll()).toHaveLength(5);
  });

  it('создаёт пользователя без указания возраста', () => {
    const created = service.create({ name: 'Белов Игорь', email: 'belov@example.com' });

    expect(created.age).toBeUndefined();
  });

  it('не допускает повторной регистрации одного адреса электронной почты', () => {
    expect(() =>
      service.create({ name: 'Дубликат', email: 'admin@toolshop.ru' }),
    ).toThrow(ConflictException);
  });

  it('сообщает об отсутствии пользователя кодом 404', () => {
    expect(() => service.findById('00000000-0000-4000-8000-000000000000')).toThrow(
      NotFoundException,
    );
  });

  it('не позволяет понизить роль единственного администратора', () => {
    const admin = service.findAll().find((user) => user.role === Role.Admin);

    expect(() => service.changeRole(admin!.id, Role.Customer)).toThrow(ConflictException);
  });

  it('запрещает удаление пользователя с оформленными заказами', () => {
    const customer = service
      .findAll()
      .find((user) => user.email === 'kovalev@example.com');

    expect(() => service.remove(customer!.id)).toThrow(ConflictException);
  });
});
