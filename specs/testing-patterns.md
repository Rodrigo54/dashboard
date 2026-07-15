# Padrões de teste (Angular + Vitest)

> Leia este documento ao escrever testes de services/components/guards
> Angular que envolvam `resource()`, `effect()`, injeção de dependência ou o
> helper `invoke()` de IPC. Cobre idiomas que não são óbvios a partir da API
> do Angular sozinha — cada um foi descoberto resolvendo um teste real deste
> projeto (veja o arquivo de exemplo citado em cada seção).

## Flush de `effect()` em modo zoneless: `TestBed.tick()`

`effect()` não roda sincronamente no momento em que é registrado — precisa de
um flush explícito pra rodar em teste (não há zone.js aqui pra fazer isso
sozinho). Registre o effect dentro de `TestBed.runInInjectionContext(...)`,
mute o signal que ele observa, e chame `TestBed.tick()` antes de checar o
resultado:

```ts
const model = signal<TransactionCoreFields>({ accountId: '', type: 'income', category: 'rent' });
TestBed.runInInjectionContext(() => service.wireCategoryReset(model));
TestBed.tick();
expect(model().category).toBe('');
```

Exemplo completo:
[`transaction-form-fields.service.spec.ts`](../src/renderer/app/features/transactions/shared/transaction-form-fields.service.spec.ts).

## Fake de um service baseado em `resource()`

Um `resource()` não é um signal — é um objeto com `.value` (um `Signal<T>`),
`.isLoading()`, `.error()`, `.reload()`. Pra fake, não recrie o `resource()`
inteiro: um objeto plano com um `signal()` no lugar de `.value` já cobre o
que os consumidores leem, e dá pra mudar o valor no meio do teste com
`.value.set(...)`:

```ts
class FakeAccountsService {
  readonly accounts = { value: signal<Account[] | undefined>(undefined), reload: vi.fn() };
}
```

Combine com `{ provide: AccountsService, useValue: new FakeAccountsService() }`
no `TestBed.configureTestingModule`. Se o service sob teste também injeta
outros services (ex.: um coordenador que só repassa `.reload()`), não
precisa fakear o coordenador — deixe o `TestBed` construir a classe real,
que vai injetar os fakes já fornecidos.

Exemplo completo:
[`transaction-form-fields.service.spec.ts`](../src/renderer/app/features/transactions/shared/transaction-form-fields.service.spec.ts).

## Testar uma função que usa `inject()`/`effect()` fora de um componente

Guards (`CanActivateFn`) e métodos de service que chamam `inject()`/`effect()`
só funcionam dentro de um contexto de injeção. Pra testar isolado (sem montar
um componente/rota real), rode a chamada dentro de
`TestBed.runInInjectionContext(...)`:

```ts
const result = TestBed.runInInjectionContext(() => loginGuard({} as never, {} as never));
expect(result).toBeInstanceOf(UrlTree);
```

Exemplo completo:
[`login.guard.spec.ts`](../src/renderer/app/features/auth/login.guard.spec.ts).

## Testar um service que chama `invoke()` direto: `vi.mock`

Services que falam IPC direto (não por outro service intermediário) chamam
`invoke()` de `@/core/ipc/invoke` — uma função solta, não injetável. Pra
isolar, mocke o módulo inteiro com `vi.mock` (hoisted pelo Vitest — funciona
mesmo com import estático no topo do arquivo) e injete o service real via
`TestBed`:

```ts
const invoke = vi.fn();
vi.mock('@/core/ipc/invoke', () => ({ invoke: (...args: unknown[]) => invoke(...args) }));

// ... no teste:
invoke.mockResolvedValue(publicUser());
await service.login('rodrigo@example.com', 'senha123');
expect(invoke).toHaveBeenCalledWith('auth:login', {
  email: 'rodrigo@example.com',
  password: 'senha123',
});
```

Exemplo completo:
[`auth.service.spec.ts`](../src/renderer/app/features/auth/auth.service.spec.ts).

## Montar um componente fundo na árvore: fake das dependências pesadas

`TestBed.createComponent(X)` instancia toda a árvore de componentes/services
importados por `X`, mesmo os que o teste não usa diretamente. Se algum deles
lê `window.electron` num inicializador de campo (não dentro de uma função
async — ver `WindowControlsService`), o teste quebra com
`TypeError: Cannot read properties of undefined`, mesmo sem o teste tocar
nessa parte da árvore. Forneça um fake mínimo via `useValue` pro service
problemático, em vez de tentar mockar `window.electron` globalmente:

```ts
class FakeWindowControlsService {
  readonly maximized = signal(false);
  minimize = vi.fn();
  maximizeToggle = vi.fn();
  close = vi.fn();
}
// providers: [{ provide: WindowControlsService, useValue: new FakeWindowControlsService() }]
```

Exemplo completo:
[`frame-layout.spec.ts`](../src/renderer/app/shared/frame/frame-layout.spec.ts).
