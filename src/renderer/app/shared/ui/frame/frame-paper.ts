import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-frame-paper',
  imports: [],
  template: `
    <div
      class="w-full h-full rounded-md bg-card flex items-center justify-between p-6 shadow shadow-foreground/35 overflow-auto"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FramePaper {}
