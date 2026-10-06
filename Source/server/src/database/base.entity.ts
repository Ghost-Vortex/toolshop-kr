/** Базовые поля, общие для всех хранимых сущностей */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}
