import { Global, Module } from '@nestjs/common';
import { InMemoryDatabase } from './in-memory.database';

/**
 * Модуль источника данных.
 * Декоратор @Global() делает провайдер InMemoryDatabase доступным
 * во всех модулях приложения без повторного импорта.
 */
@Global()
@Module({
  providers: [InMemoryDatabase],
  exports: [InMemoryDatabase],
})
export class DatabaseModule {}
