import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { EVENT_MANAGER_PLUGINS } from '@angular/platform-browser';

import { DebounceEventManagerPlugin } from './debounce-event-manager.plugin';
import { EventModifierPlugin } from './event-modifier.plugin';

/** Registra os modificadores de evento de template (`.prevent`, `.stop`, `.debounce`...). */
export function provideEventManagerPlugins(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: EVENT_MANAGER_PLUGINS, useClass: EventModifierPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: DebounceEventManagerPlugin, multi: true },
  ]);
}
