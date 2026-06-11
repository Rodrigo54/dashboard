// Contrato compartilhado, em nível de tipo, dos canais de IPC.
//
// É um arquivo de declaração (`.d.ts`): não emite JavaScript e fica isento da
// checagem de `rootDir`, então pode ser importado tanto pelo processo main
// (`src/main`, tsc NodeNext) quanto pelo renderer Angular (`src/renderer`),
// servindo como fonte única de verdade sem acoplar runtimes.
//
// Os decorators apagam as informações literais (o nome em `@Controller('ping')`
// e a ação em `@action('...')` não sobrevivem no sistema de tipos), por isso o
// mapa abaixo é mantido manualmente — uma linha por controller.

/** Ações CRUD padrão registradas pelos decorators de método. */
export type CrudAction = 'create' | 'save' | 'read' | 'update' | 'remove' | 'list';

/**
 * Mapa de controller -> ações disponíveis.
 *
 * A chave é o nome passado em `@Controller(...)`; o valor são as ações expostas
 * (as CRUD padrão via `CrudAction` mais quaisquer ações customizadas declaradas
 * com `@action('...')`).
 */
export interface ControllerChannelMap {
  ping: CrudAction | 'timestamp';
  auth: 'check' | 'login' | 'register' | 'logout' | 'me';
  appdata: 'read';
  environment: 'read';
  accounts: CrudAction | 'types' | 'providers' | 'currencies';
}

/** União de todos os canais válidos no formato `controller:action`. */
export type Channels = {
  [C in keyof ControllerChannelMap]: `${C & string}:${ControllerChannelMap[C]}`;
}[keyof ControllerChannelMap];
