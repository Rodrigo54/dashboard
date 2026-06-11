// Polyfill de metadata de decorators (stage 3) caso o runtime ainda não exponha
// `Symbol.metadata`. Precisa rodar antes da avaliação de qualquer classe decorada.
(Symbol as { metadata?: symbol }).metadata ??= Symbol.for('Symbol.metadata');
const METADATA = (Symbol as unknown as { metadata: symbol }).metadata;

const CONTROLLER_NAME = Symbol('controller:name');
const CONTROLLER_ACTIONS = Symbol('controller:actions');

// `any` nos argumentos é necessário para aceitar qualquer assinatura de
// construtor (variância de construtores).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ControllerClass = (new (...args: any[]) => object) & { readonly name: string };

/** Mapa de ação de IPC -> chave do método que a implementa. */
export type ActionMap = Record<string, string | symbol>;

/**
 * Decorator de classe que registra o nome de IPC de um controller.
 * Usa decorators padrão do ECMAScript (sem `experimentalDecorators`).
 */
export function Controller(name: string) {
  return function <T extends ControllerClass>(target: T, _context: ClassDecoratorContext): T {
    Reflect.defineProperty(target, CONTROLLER_NAME, {
      value: name,
      enumerable: false,
      writable: false,
      configurable: false,
    });
    return target;
  };
}

/** Recupera o nome registrado por `@Controller(...)`. */
export function getControllerName(target: ControllerClass): string {
  const name = (target as unknown as Record<symbol, unknown>)[CONTROLLER_NAME];
  if (typeof name !== 'string') {
    throw new Error(`Controller ${target.name} não foi decorado com @Controller(...).`);
  }
  return name;
}

/**
 * Fábrica de decorators de método que associam um método a uma ação de IPC.
 * O nome do método pode diferir do nome da ação (ex.: `findOne` -> `read`).
 * Também pode ser usado para criar ações customizadas, basta passar o nome desejado como argumento.
 */
export function action(actionName: string) {
  return function (_value: unknown, context: ClassMethodDecoratorContext): void {
    const metadata = context.metadata as Record<symbol, unknown>;
    const actions = (metadata[CONTROLLER_ACTIONS] ??= {}) as ActionMap;
    actions[actionName] = context.name;
  };
}

export const create = action('create');
export const save = action('save');
export const read = action('read');
export const update = action('update');
export const remove = action('remove');
export const list = action('list');

/** Recupera o mapa de ações registrado pelos decorators de método. */
export function getControllerActions(target: ControllerClass): ActionMap {
  const metadata = (target as unknown as Record<symbol, unknown>)[METADATA] as
    | Record<symbol, unknown>
    | undefined;
  const actions = metadata?.[CONTROLLER_ACTIONS] as ActionMap | undefined;
  if (!actions) {
    throw new Error(`Controller ${target.name} não possui métodos decorados com ações.`);
  }
  return actions;
}
