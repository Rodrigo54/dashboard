import type { AppData, PublicEnvironment } from '@shared/types';
import { getEnvironment, getPublicEnvironment } from '../../environment/environment.module';
import { action, Controller } from '../../core/controller.decorator';

/**
 * Metadados de app-level expostos ao renderer. Reúne o environment ativo (sem o
 * bloco `security`) e os dados de runtime do app num único controller, já que
 * nenhum dos dois tem domínio próprio.
 */
@Controller('application')
export class ApplicationController {
  /** Environment ativo (environments/*.yml), já sem o bloco `security`. */
  @action('env')
  async findEnvironment(): Promise<PublicEnvironment> {
    return getPublicEnvironment();
  }

  /** Metadados de runtime do app (nome, versão, versões de Electron/Chrome/Node). */
  @action('info')
  async findAppData(): Promise<AppData> {
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
