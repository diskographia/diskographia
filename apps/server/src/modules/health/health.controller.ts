import { Controller, Get } from '@nestjs/common';

// лёгкая проверка живости: без базы, чтобы docker и nginx не будили postgres на каждом опросе
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { ok: true };
  }
}
