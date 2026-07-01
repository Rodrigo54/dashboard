import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-frame-header',
  imports: [],
  template: `
    <div
      class="bg-primary text-primary-foreground flex items-center justify-between gap-4 py-10 px-4"
    >
      <div class="flex items-center gap-4">
        <div class="">
          <ng-content select="[slot='icon']" />
        </div>
        <div>
          <div class="*:text-xl *:font-semibold">
            <ng-content select="[slot='title']" />
          </div>
          <div>
            <ng-content select="[slot='subtitle']" />
          </div>
        </div>
      </div>
      <div>
        <ng-content select="[slot='actions']" />
      </div>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrameHeader {}
