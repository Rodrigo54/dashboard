# Fundo azul do shell (Frame)

O shell (`FrameLayout` + `FrameSidebar`) desenha uma área de fundo `bg-primary`
no topo do sidebar e atrás do conteúdo roteado, criando um efeito de "banner"
colorido por trás da página. As duas áreas precisam terminar na mesma altura
visual, mesmo vindo de dois componentes diferentes — é isso que as CSS custom
properties `--frame-bg-height` e `--frame-breadcrumb-height` garantem.

## As variáveis

Declaradas em [`frame-layout.ts`](./frame-layout.ts) no wrapper
`hlmSidebarWrapper` (ancestral comum do sidebar e do conteúdo principal):

```html
<div hlmSidebarWrapper style="--frame-bg-height: 192px; --frame-breadcrumb-height: 64px"></div>
```

Esse `style` é o único lugar onde os dois valores são definidos. **Nenhum
outro arquivo declara um literal** — tanto o `FrameLayout` quanto o
`FrameSidebar` só leem as variáveis via `var(...)`.

## Por que sidebar e layout somam alturas diferentes

Sidebar e `main` são irmãos dentro do mesmo wrapper e começam no mesmo `y`,
mas o `main` tem uma barra de breadcrumb (`--frame-breadcrumb-height`) **antes**
do banner azul, enquanto o sidebar não tem nada equivalente antes do seu
banner:

```
y=0   ┌─────────────┬───────────────────────┐
      │             │  breadcrumb           │
      │   sidebar   │  (--frame-breadcrumb- │
      │   banner    │   height)             │
      │  (--frame-  ├───────────────────────┤
      │   bg-height │                       │
      │      +      │   banner do layout    │
      │  --frame-   │   (--frame-bg-height) │
      │  breadcrumb-│                       │
      │   height)   │                       │
y=256 └─────────────┴───────────────────────┘
```

Por isso:

- **`FrameLayout`** ([frame-layout.ts:67-72](./frame-layout.ts#L67-L72)) usa
  `--frame-bg-height` puro — o banner mede exatamente o valor da variável,
  medido a partir de baixo do breadcrumb (que também lê a sua própria
  variável, [frame-layout.ts:39](./frame-layout.ts#L39)).
- **`FrameSidebar`** ([frame-sidebar.ts:46](./frame-sidebar.ts#L46)) soma as
  duas variáveis, já que seu banner começa antes do breadcrumb:
  `min-h-[calc(var(--frame-bg-height)+var(--frame-breadcrumb-height))]`.

Mudou a altura de qualquer uma das duas? Troque só o valor no `style` do
wrapper — os dois componentes reagem, nenhum outro arquivo precisa mudar.

## Como cada lado usa as variáveis

### `FrameLayout` — bloco + overlay

```html
<div class="min-h-0 flex-1 overflow-auto">
  <div class="h-(--frame-bg-height) bg-primary z-0"></div>
  <div class="p-4 z-10 -mt-(--frame-bg-height)">
    <router-outlet />
  </div>
</div>
```

Um bloco `bg-primary` com a altura exata do banner, seguido do conteúdo
roteado puxado para cima (`-mt`) pelo mesmo valor. O conteúdo passa a cobrir o
bloco por completo — o banner só fica visível onde a página não tiver um
fundo opaco cobrindo aquele espaço (efeito "hero" atrás de cards
translúcidos).

### `FrameSidebar` — altura mínima + spacer flexível

```html
<div
  class="bg-primary flex min-h-[calc(var(--frame-bg-height)+var(--frame-breadcrumb-height))] flex-col"
>
  <hlm-sidebar-header>...perfil (app-frame-profile)...</hlm-sidebar-header>
  <div class="flex-1"></div>
  <div hlmSidebarGroup>...menu do perfil (Início/Perfil/Notificações/Config)...</div>
</div>
```

Em vez de calcular quanto o conteúdo (header + menu) ocupa em cada estado do
sidebar (expandido/colapsado) e completar a diferença manualmente, um `div
flex-1` no meio absorve automaticamente qualquer sobra:

- **Colapsado**: header e menu ocupam menos espaço (ícones sem rótulo) → o
  spacer cresce para completar os 256px.
- **Expandido**: o rótulo "Main" do grupo reaparece (a própria lib do sidebar
  anima `margin`/`opacity` disso) e o conteúdo já passa de 256px → o spacer
  encolhe para perto de zero.

Vantagem: adicionar/remover item de `profileMenuItems`
([frame-sidebar.ts:114-119](./frame-sidebar.ts#L114-L119)) ou mudar qualquer
uma das duas variáveis não exige nenhum ajuste manual de altura — o spacer
sempre compensa.

### Transição

Nenhum dos dois lados anima `height` manualmente. A suavidade do
expandir/colapsar vem de:

- `transition-[width] duration-200 ease-linear` no próprio `hlm-sidebar`
  (contração da largura do sidebar).
- `transition-[margin,opacity] duration-200 ease-linear` no
  `hlmSidebarGroupLabel` (o rótulo "Main" desliza/esmaece).

Como o container do sidebar não tem altura explícita (só `min-height`), o
navegador recalcula o layout a cada frame dessas transições — o spacer
`flex-1` acompanha suavemente sem precisar de uma transição própria.

## Se for mexer nisso

- Precisa mudar a altura do banner ou da barra de breadcrumb? Só troque o
  valor correspondente no `style` de
  [frame-layout.ts:34](./frame-layout.ts#L34) — os dois componentes leem a
  mesma variável, nada mais precisa mudar.
- Vai adicionar mais um bloco `bg-primary` em qualquer um dos dois
  componentes? Ele precisa estar dentro do mesmo container que já usa as
  variáveis pra continuar batendo — não declare uma altura nova isolada.
