import type { AppData } from '@shared/types';
import { getEnvironment } from '../environment/environment.module';
import { Controller, read } from './controller.decorator';

@Controller('appdata')
export class AppDataController {
  @read
  async findOne(): Promise<AppData> {
    const env = getEnvironment();
    return {
      name: env.app.name,
      version: env.app.version,
      environment: env.app.environment,
      timestamp: new Date().toISOString(),
      versions: {
        electron: process.versions.electron ?? '',
        chrome: process.versions.chrome ?? '',
        node: process.versions.node ?? '',
      },
    };
  }
}
