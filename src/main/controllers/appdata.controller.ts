import { app } from 'electron';
import type { AppData } from '@shared/types';
import { Controller, read } from './controller.decorator';

@Controller('appdata')
export class AppDataController {
  @read
  async findOne(): Promise<AppData> {
    return {
      name: app.getName(),
      version: app.getVersion(),
      environment: app.isPackaged ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      versions: {
        electron: process.versions.electron ?? '',
        chrome: process.versions.chrome ?? '',
        node: process.versions.node ?? '',
      },
    };
  }
}
