import { SetMetadata, CustomDecorator } from '@nestjs/common';

/** Ключ метаданных для маршрутов, не требующих аутентификации */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Помечает обработчик как общедоступный: JwtAuthGuard пропускает такой
 * запрос даже без заголовка Authorization.
 */
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
