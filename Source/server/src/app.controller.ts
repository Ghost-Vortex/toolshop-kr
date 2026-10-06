import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { InMemoryDatabase } from './database/in-memory.database';

/** Ответ служебного эндпоинта проверки состояния */
interface HealthResponse {
  status: 'ok';
  application: string;
  version: string;
  uptimeSeconds: number;
  storage: Array<{ entity: string; records: number }>;
}

/** Служебный контроллер: проверка работоспособности сервера */
@ApiTags('Служебные')
@Controller()
export class AppController {
  constructor(private readonly database: InMemoryDatabase) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Проверка состояния сервера и содержимого источника данных' })
  @ApiOkResponse({ description: 'Сервер работает' })
  health(): HealthResponse {
    return {
      status: 'ok',
      application: 'ToolShop API',
      version: '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      storage: this.database.describe(),
    };
  }
}
