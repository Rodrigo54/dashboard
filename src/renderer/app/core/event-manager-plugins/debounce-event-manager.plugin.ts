import type { ListenerOptions } from '@angular/core';
import { EventManagerPlugin } from '@angular/platform-browser';

/**
 * Angular EventManagerPlugin que adiciona o modificador `.debounce` nos templates.
 *
 * @example
 * Formato esperado: "event.debounce.delay" (ex.: "input.debounce.150")
 * (input.debounce.150)="handler($event)"
 */
export class DebounceEventManagerPlugin extends EventManagerPlugin {
  override supports(eventName: string): boolean {
    return /\.debounce(?:\.|$)/.test(eventName);
  }

  override addEventListener(
    element: HTMLElement,
    eventName: string,
    handler: (event: Event) => void,
    options?: ListenerOptions,
    // eslint-disable-next-line
  ): Function {
    // Se o delay for omitido ou inválido, usa 300ms por padrão.
    const [event, , delay] = eventName.split('.');
    const parsedDelay = Number.parseInt(delay);
    const resolvedDelay = Number.isNaN(parsedDelay) ? 300 : parsedDelay;

    let timeoutId!: ReturnType<typeof setTimeout>;
    const listener = (event: Event) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handler(event), resolvedDelay);
    };
    const unsubscribe = this.manager.addEventListener(element, event, listener, options);
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }
}
