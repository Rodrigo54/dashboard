// Polyfill de metadata de decorators (stage 3) caso o runtime ainda não exponha
// `Symbol.metadata`. Precisa rodar antes da avaliação de qualquer classe decorada.
(Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata');

const SERVICE_NAME = Symbol('service:name');

// `any` nos argumentos é necessário para aceitar qualquer assinatura de
// construtor (variância de construtores).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceClass = (new (...args: any[]) => object) & { readonly name: string };

/** Toda classe `@Service(...)` se acumula aqui ao ser avaliada (auto-registro). */
const registeredServices: ServiceClass[] = [];

/**
 * Decorator de classe que registra o nome de um service e o adiciona à lista de
 * services conhecidos. Usa decorators padrão do ECMAScript (sem
 * `experimentalDecorators`). O auto-registro só acontece quando o módulo da
 * classe é avaliado — veja como `services.providers.ts` garante isso.
 */
export function Service(name: string) {
  return function <T extends ServiceClass>(target: T, _context: ClassDecoratorContext): T {
    Reflect.defineProperty(target, SERVICE_NAME, {
      value: name,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    registeredServices.push(target);
    return target;
  };
}

/** Classes decoradas com `@Service(...)` já avaliadas, na ordem de carga. */
export function getRegisteredServices(): readonly ServiceClass[] {
  return registeredServices;
}

/** Recupera o nome registrado por `@Service(...)`. */
export function getServiceName(target: ServiceClass): string {
  const name = (target as unknown as Record<symbol, unknown>)[SERVICE_NAME];
  if (typeof name !== 'string') {
    throw new Error(`Service ${target.name} não foi decorado com @Service(...).`);
  }
  return name;
}
