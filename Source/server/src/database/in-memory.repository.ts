import { randomUUID } from 'crypto';
import { BaseEntity } from './base.entity';

/** Функция-условие для отбора записей */
export type Predicate<T> = (entity: T) => boolean;

/**
 * Хранилище записей одного типа в оперативной памяти.
 * Внутри — структура Map, поэтому поиск записи по идентификатору
 * выполняется сразу, без перебора всех записей.
 *
 * Данные живут только пока работает программа и не сохраняются
 * между запусками — этого требует техническое задание.
 */
export class InMemoryRepository<T extends BaseEntity> {
  private readonly storage = new Map<string, T>();

  constructor(private readonly entityName: string) {}

  /** Имя сущности — нужно для сообщений и статистики */
  get name(): string {
    return this.entityName;
  }

  /** Сколько записей сейчас хранится */
  get size(): number {
    return this.storage.size;
  }

  /** Все записи в порядке добавления */
  findAll(): T[] {
    return Array.from(this.storage.values());
  }

  /** Записи, подходящие под условие */
  findBy(predicate: Predicate<T>): T[] {
    return this.findAll().filter(predicate);
  }

  /** Запись по идентификатору или undefined, если её нет */
  findById(id: string): T | undefined {
    return this.storage.get(id);
  }

  /** Первая запись, подходящая под условие */
  findOne(predicate: Predicate<T>): T | undefined {
    return this.findAll().find(predicate);
  }

  /** Есть ли запись, подходящая под условие */
  exists(predicate: Predicate<T>): boolean {
    return this.findOne(predicate) !== undefined;
  }

  /** Создаёт запись: сам выдаёт идентификатор UUID и даты */
  create(data: Partial<T>): T {
    const now = new Date().toISOString();
    const entity = { ...data, id: randomUUID(), createdAt: now, updatedAt: now } as T;
    this.storage.set(entity.id, entity);
    return entity;
  }

  /** Меняет часть полей записи; возвращает undefined, если записи нет */
  update(id: string, changes: Partial<T>): T | undefined {
    const entity = this.storage.get(id);
    if (!entity) {
      return undefined;
    }

    const updated = { ...entity, ...changes, updatedAt: new Date().toISOString() };
    this.storage.set(id, updated);
    return updated;
  }

  /** Удаляет запись, возвращает true, если она была */
  remove(id: string): boolean {
    return this.storage.delete(id);
  }

  /** Полностью очищает хранилище (нужно в тестах) */
  clear(): void {
    this.storage.clear();
  }

  /** Загружает готовые записи вместе с их идентификаторами */
  load(entities: T[]): void {
    entities.forEach((entity) => this.storage.set(entity.id, entity));
  }
}
