import type { Data, UrlSegment } from '@angular/router';

export interface Breadcrumb {
  readonly label: string;
  readonly url: string;
}

export interface RouteSnapshotLike {
  readonly data: Data;
  readonly url: UrlSegment[];
  readonly children: RouteSnapshotLike[];
}

const HOME_BREADCRUMB: Breadcrumb = { label: 'Home', url: '/home' };

/** Anda a árvore de rotas ativas coletando `data.breadcrumb`, ignorando segmentos sem label. */
export function buildBreadcrumbs(root: RouteSnapshotLike): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [];
  let node: RouteSnapshotLike | undefined = root;
  let accumulatedUrl = '';

  while (node) {
    const segment = node.url.map((s) => s.path).join('/');

    // Rotas com `path: ''` herdam `data` do pai (estratégia `emptyOnly` do
    // Angular) e não representam um lugar distinto na URL — ignoradas para
    // não duplicar o crumb do segmento pai.
    if (segment) {
      accumulatedUrl += `/${segment}`;

      const label = node.data['breadcrumb'] as string | undefined;
      if (label) {
        crumbs.push({ label, url: accumulatedUrl });
      }
    }

    node = node.children[0];
  }

  if (crumbs[0]?.url === HOME_BREADCRUMB.url) {
    return crumbs;
  }

  return [HOME_BREADCRUMB, ...crumbs];
}
