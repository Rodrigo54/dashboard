import type { PublicEnvironment } from '@shared/types';
import { getPublicEnvironment } from '../environment/environment.module';
import { Controller, read } from './controller.decorator';

@Controller('environment')
export class EnvironmentController {
  /** Expõe ao renderer o environment ativo, já sem o bloco `security`. */
  @read
  async findOne(): Promise<PublicEnvironment> {
    return getPublicEnvironment();
  }
}
