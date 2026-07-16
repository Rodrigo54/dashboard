import { describe, expect, it } from 'vitest';

import { buildBreadcrumbs, RouteSnapshotLike } from './frame-breadcrumb.utils';

function segment(path: string): { path: string } {
  return { path };
}

function node(
  path: string,
  data: Record<string, unknown>,
  children: RouteSnapshotLike[] = [],
): RouteSnapshotLike {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    url: path ? [segment(path) as any] : [],
    data,
    children,
  };
}

describe('buildBreadcrumbs', () => {
  it('prependa Home quando a cadeia não começa em Home', () => {
    const root = node('', {}, [node('accounts', { breadcrumb: 'Contas' })]);

    expect(buildBreadcrumbs(root)).toEqual([
      { label: 'Home', url: '/home' },
      { label: 'Contas', url: '/accounts' },
    ]);
  });

  it('não duplica Home quando a própria cadeia já começa nela', () => {
    const root = node('', {}, [node('home', { breadcrumb: 'Home' })]);

    expect(buildBreadcrumbs(root)).toEqual([{ label: 'Home', url: '/home' }]);
  });

  it('ignora segmentos sem data.breadcrumb (ex.: rotas index pathless)', () => {
    const root = node('', {}, [
      node('accounts', { breadcrumb: 'Contas' }, [
        node('', {}, [node('new', { breadcrumb: 'Nova Conta' })]),
      ]),
    ]);

    expect(buildBreadcrumbs(root)).toEqual([
      { label: 'Home', url: '/home' },
      { label: 'Contas', url: '/accounts' },
      { label: 'Nova Conta', url: '/accounts/new' },
    ]);
  });

  it('acumula a URL com parâmetros dinâmicos resolvidos no segmento', () => {
    const root = node('', {}, [
      node('accounts', { breadcrumb: 'Contas' }, [node('42', { breadcrumb: 'Editar Conta' })]),
    ]);

    expect(buildBreadcrumbs(root)).toEqual([
      { label: 'Home', url: '/home' },
      { label: 'Contas', url: '/accounts' },
      { label: 'Editar Conta', url: '/accounts/42' },
    ]);
  });

  it('monta um único crumb para rotas com path composto (ex.: edit/:id)', () => {
    const root = node('', {}, [
      node('accounts', { breadcrumb: 'Contas' }, [node('edit/7', { breadcrumb: 'Editar Conta' })]),
    ]);

    expect(buildBreadcrumbs(root)).toEqual([
      { label: 'Home', url: '/home' },
      { label: 'Contas', url: '/accounts' },
      { label: 'Editar Conta', url: '/accounts/edit/7' },
    ]);
  });

  it('não duplica o crumb do pai quando o filho pathless herda o mesmo data (emptyOnly)', () => {
    // Angular propaga `data` do pai para filhos com `path: ''` (estratégia
    // `emptyOnly`), então o node pathless chega aqui com o MESMO
    // `data.breadcrumb` do pai — sem segmento de URL próprio.
    const root = node('', {}, [
      node('accounts', { breadcrumb: 'Contas' }, [node('', { breadcrumb: 'Contas' })]),
    ]);

    expect(buildBreadcrumbs(root)).toEqual([
      { label: 'Home', url: '/home' },
      { label: 'Contas', url: '/accounts' },
    ]);
  });

  it('retorna só Home quando nenhum segmento tem breadcrumb', () => {
    const root = node('', {}, [node('unknown', {})]);

    expect(buildBreadcrumbs(root)).toEqual([{ label: 'Home', url: '/home' }]);
  });
});
