import { getRegisteredServices, getServiceName, type ServiceClass } from './service.decorator';

// Avalia todos os módulos `*.service.ts` sob `features/` para que seus decorators
// `@Service` rodem e as classes se auto-registrem (`getRegisteredServices`).
// Sem este import um service que ninguém mais importa nunca chegaria ao
// registry. `import.meta.glob` (eager) é resolvido em build-time pelo Vite e
// vira imports estáticos — não há varredura de disco em runtime.
import.meta.glob('../features/**/*.service.ts', { eager: true });

const registry = new Map<string, object>();

/**
 * Instancia cada service decorado com `@Service(...)` e o registra no `registry`
 * sob o nome declarado. Chamado uma vez em `app.whenReady` (após `initDb`).
 * Reexecutar substitui as instâncias — útil para os testes.
 */
export function initServices() {
  registry.clear();
  for (const Service of getRegisteredServices()) {
    const name = getServiceName(Service);
    registry.set(name, new Service());
  }
}

/** Busca no registry a instância já criada, ou lança se ainda não foi registrada. */
function resolveService<T extends ServiceClass>(token: T): InstanceType<T> {
  const instance = registry.get(getServiceName(token));
  if (!instance) {
    throw new Error(
      `Service "${token.name}" não foi inicializado. Chame initServices() antes de usá-lo.`,
    );
  }
  return instance as InstanceType<T>;
}

/**
 * Injeta um service pela própria classe (token), no estilo do `inject()` do
 * Angular. A resolução é **preguiçosa**: devolve um proxy que só consulta o
 * `registry` no primeiro acesso a uma propriedade/método — então pode ser usado
 * em campo ou construtor sem depender da ordem de `initServices()` (e suporta
 * dependências circulares). O alvo real é memorizado no primeiro acesso.
 */
export function inject<T extends ServiceClass>(token: T): InstanceType<T> {
  let instance: InstanceType<T> | undefined;
  const target = (): InstanceType<T> => (instance ??= resolveService(token));

  return new Proxy({} as InstanceType<T>, {
    get(_t, prop) {
      const self = target();
      const value = Reflect.get(self, prop, self);
      return typeof value === 'function' ? value.bind(self) : value;
    },
    set(_t, prop, value) {
      return Reflect.set(target(), prop, value);
    },
    has(_t, prop) {
      return Reflect.has(target(), prop);
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(target());
    },
  });
}
