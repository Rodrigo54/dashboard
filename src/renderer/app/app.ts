import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe],
  template: `
    <main class="container">
      <h1>{{ title() }}</h1>
      <p>Angular 22 + Electron 42</p>

      <button type="button" (click)="ping()">Test IPC (ping)</button>
      <button type="button" (click)="list()">Test IPC (list)</button>
      <button type="button" (click)="timestamp()">Test IPC (timestamp)</button>
      @if (reply()) {
        <p>Main process replied: <strong>{{ reply() | json }}</strong></p>
      }
    </main>
  `,
  styles: `
    .container {
      font-family: system-ui, sans-serif;
      max-width: 40rem;
      margin: 4rem auto;
      padding: 2rem;
      text-align: center;
    }
    button {
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid #555;
      cursor: pointer;
    }
  `,
})
export class App {
  protected readonly title = signal('dashboard');
  protected readonly reply = signal<any>(null);

  protected async ping(): Promise<void> {
    const result = await window.electron.invoke<string>('ping:read');
    this.reply.set(result);
  }

  protected async list(): Promise<void> {
    const result = await window.electron.invoke<string[]>('ping:list');
    this.reply.set(result);
  }

  protected async timestamp(): Promise<void> {
    const result = await window.electron.invoke<string>('ping:timestamp');
    this.reply.set(result);
  }
}
