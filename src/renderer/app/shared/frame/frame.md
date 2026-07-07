# Fundo azul do shell (Frame)

O shell (`FrameLayout` + `FrameSidebar`) desenha uma área de fundo `bg-primary`
no topo do sidebar e atrás do conteúdo roteado, criando um efeito de "banner"
colorido por trás da página. As duas áreas precisam terminar na mesma altura
visual, mesmo vindo de dois componentes diferentes — é isso que a variável CSS
`--frame-bg-height` garante.

## A variável

Declarada em [`frame-layout.ts`](./frame-layout.ts) no wrapper
`hlmSidebarWrapper` (ancestral comum do sidebar e do conteúdo principal):

```html
<div hlmSidebarWrapper style="--frame-bg-height: 192px"></div>
```

Ela é o único lugar onde o valor da altura do banner é definido. Mudou o
valor, os dois lados reagem — nenhum outro arquivo deveria hardcodar `192px`.

## Por que sidebar e layout calculam diferente

Sidebar e `main` são irmãos dentro do mesmo wrapper e começam no mesmo `y`,
mas o `main` tem uma barra de breadcrumb (`h-16`, 64px) **antes** do banner
azul, enquanto o sidebar não tem nada equivalente antes do seu banner:

```
y=0   ┌─────────────┬───────────────────────┐
      │             │  breadcrumb (64px)    │
      │   sidebar   ├───────────────────────┤
      │   banner    │                       │
      │  (192px +   │   banner do layout    │
      │    64px)    │       (192px)         │
y=256 └─────────────┴───────────────────────┘
```

Por isso:

- **`FrameLayout`** ([frame-layout.ts:67-72](./frame-layout.ts#L67-L72)) usa
  `--frame-bg-height` puro — o banner mede exatamente 192px, medidos a partir
  de baixo do breadcrumb.
- **`FrameSidebar`** ([frame-sidebar.ts:46](./frame-sidebar.ts#L46)) soma os
  64px do breadcrumb, já que seu banner começa 64px mais acima:
  `min-h-[calc(var(--frame-bg-height)+64px)]`.

Se a altura da barra de breadcrumb mudar, esse `64px` em `frame-sidebar.ts`
precisa mudar junto (é o único lugar que conhece esse número).

## Como cada lado usa a variável

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
<div class="bg-primary flex min-h-[calc(var(--frame-bg-height)+64px)] flex-col">
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
([frame-sidebar.ts:114-119](./frame-sidebar.ts#L114-L119)) ou mudar
`--frame-bg-height` não exige nenhum ajuste manual de altura — o spacer
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

- Precisa mudar o tamanho do banner? Só troque `192px` em
  [frame-layout.ts:34](./frame-layout.ts#L34).
- Mudou a altura da barra de breadcrumb (`h-16`)? Atualize o `64px` em
  [frame-sidebar.ts:46](./frame-sidebar.ts#L46) para o novo valor.
- Vai adicionar mais um bloco `bg-primary` em qualquer um dos dois
  componentes? Ele precisa estar dentro do mesmo container que já usa
  `--frame-bg-height`/`min-h-[calc(...)]` para continuar batendo — não
  declare uma altura nova isolada.
