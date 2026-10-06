import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

/**
 * Сквозные (end-to-end) тесты программного интерфейса.
 * Приложение поднимается целиком, запросы выполняются по протоколу HTTP,
 * что позволяет проверить совместную работу контроллеров, конвейеров
 * проверки данных, гвардов и фильтра исключений.
 */
describe('ToolShop API (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/users', () => {
    it('возвращает список всех пользователей без хешей паролей', async () => {
      const response = await request(server).get('/api/users').expect(HttpStatus.OK);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(4);
      expect(response.body[0]).toEqual(
        expect.objectContaining({ id: expect.any(String), name: expect.any(String), email: expect.any(String) }),
      );
      expect(response.body[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /api/users/:id', () => {
    it('возвращает пользователя по идентификатору', async () => {
      const list = await request(server).get('/api/users');
      const expected = list.body[0];

      const response = await request(server)
        .get(`/api/users/${expected.id}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(expected.id);
      expect(response.body.email).toBe(expected.email);
    });

    it('отвечает кодом 404, если пользователя не существует', async () => {
      await request(server)
        .get('/api/users/00000000-0000-4000-8000-000000000000')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('отвечает кодом 400, если идентификатор не является UUID', async () => {
      await request(server).get('/api/users/not-a-uuid').expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /api/users', () => {
    it('создаёт пользователя с обязательными полями', async () => {
      const payload = { name: 'Тестовый Пользователь', email: 'e2e-user@example.com', age: 25 };

      const response = await request(server)
        .post('/api/users')
        .send(payload)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(
        expect.objectContaining({ name: payload.name, email: payload.email, age: payload.age }),
      );
      expect(response.body.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('отклоняет запрос без обязательного поля name', async () => {
      const response = await request(server)
        .post('/api/users')
        .send({ email: 'no-name@example.com' })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('name')]),
      );
    });

    it('отклоняет некорректный адрес электронной почты', async () => {
      await request(server)
        .post('/api/users')
        .send({ name: 'Некорректная почта', email: 'not-an-email' })
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('отклоняет повторную регистрацию занятого адреса', async () => {
      await request(server)
        .post('/api/users')
        .send({ name: 'Дубликат', email: 'admin@toolshop.ru' })
        .expect(HttpStatus.CONFLICT);
    });
  });

  describe('Разграничение доступа', () => {
    it('не допускает к панели управления запрос без токена', async () => {
      await request(server).get('/api/products/management').expect(HttpStatus.UNAUTHORIZED);
    });

    it('запрещает покупателю изменять каталог', async () => {
      const login = await request(server)
        .post('/api/auth/login')
        .send({ email: 'kovalev@example.com', password: 'customer12345' })
        .expect(HttpStatus.OK);

      await request(server)
        .delete('/api/categories/11111111-1111-4111-8111-000000000001')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('разрешает администратору просмотр панели управления', async () => {
      const login = await request(server)
        .post('/api/auth/login')
        .send({ email: 'admin@toolshop.ru', password: 'admin12345' })
        .expect(HttpStatus.OK);

      await request(server)
        .get('/api/products/management')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe('Каталог товаров', () => {
    it('возвращает страницу каталога', async () => {
      const response = await request(server)
        .get('/api/products?page=1&limit=5')
        .expect(HttpStatus.OK);

      expect(response.body.items).toHaveLength(5);
      expect(response.body.total).toBeGreaterThanOrEqual(14);
    });

    it('фильтрует каталог по строке поиска', async () => {
      const response = await request(server)
        .get('/api/products?search=перфоратор')
        .expect(HttpStatus.OK);

      expect(response.body.total).toBe(1);
      expect(response.body.items[0].sku).toBe('PWR-0850');
    });

    it('отклоняет неизвестный параметр запроса', async () => {
      await request(server)
        .get('/api/products?unknown=1')
        .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    });
  });
});
