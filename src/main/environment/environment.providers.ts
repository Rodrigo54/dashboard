import { publicEnvironmentSchema } from '@shared/schemas';
import type { Environment, PublicEnvironment } from '@shared/types';
import developmentYml from '../../../environments/development.yml?raw';
import productionYml from '../../../environments/production.yml?raw';
import { parseEnvironment } from './environment.parser';

// Dono do environment de runtime do processo main. Os YAML são embutidos no
// bundle em build-time (imports `?raw` do Vite) e o modo do electron-vite
// decide qual vale: `dev` builda em development, `build`/`preview`/`dist` em
// production — sem leitura de disco nem empacotamento extra.

let _environment: Environment | undefined;

/** Retorna o environment validado do processo atual (memorizado). */
export function getEnvironment(): Environment {
  _environment ??= parseEnvironment(import.meta.env.DEV ? developmentYml : productionYml);
  return _environment;
}

/** Subconjunto seguro para enviar ao renderer — o parse descarta `security`. */
export function getPublicEnvironment(): PublicEnvironment {
  return publicEnvironmentSchema.parse(getEnvironment());
}
