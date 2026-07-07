import { HlmBreadcrumbImports } from '@/shared/spartan/breadcrumb';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { buildBreadcrumbs } from './frame-breadcrumb.utils';

@Component({
  selector: 'app-frame-breadcrumb',
  imports: [HlmBreadcrumbImports],
  template: `
    <nav hlmBreadcrumb>
      <ol hlmBreadcrumbList class="text-primary-foreground/80">
        @for (crumb of breadcrumbs(); track crumb.url; let last = $last) {
          <li hlmBreadcrumbItem>
            @if (last) {
              <span hlmBreadcrumbPage class="text-primary-foreground">{{ crumb.label }}</span>
            } @else {
              <a hlmBreadcrumbLink class="hover:text-primary-foreground" [link]="crumb.url">{{
                crumb.label
              }}</a>
            }
          </li>
          @if (!last) {
            <li hlmBreadcrumbSeparator class="flex items-center"></li>
          }
        }
      </ol>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameBreadcrumb {
  readonly #router = inject(Router);

  protected readonly breadcrumbs = toSignal(
    this.#router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => buildBreadcrumbs(this.#router.routerState.snapshot.root)),
    ),
    { initialValue: buildBreadcrumbs(this.#router.routerState.snapshot.root) },
  );
}
