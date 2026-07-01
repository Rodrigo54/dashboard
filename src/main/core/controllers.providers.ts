import { ipcMain } from 'electron';
import {
  getControllerActions,
  getControllerName,
  getRegisteredControllers,
} from './controller.decorator';

// Avalia todos os módulos `*.controller.ts` sob `features/` para que seus
// decorators `@Controller` rodem e as classes se auto-registrem
// (`getRegisteredControllers`). Sem este import um controller que ninguém mais
// importa nunca chegaria ao IPC. `import.meta.glob` (eager) é resolvido em
// build-time pelo Vite e vira imports estáticos — não há varredura de disco em
// runtime.
import.meta.glob('../features/**/*.controller.ts', { eager: true });

export function initControllers() {
  for (const Controller of getRegisteredControllers()) {
    const instance = new Controller() as unknown as Record<
      string | symbol,
      (payload?: unknown) => Promise<unknown>
    >;
    const name = getControllerName(Controller);
    const actions = getControllerActions(Controller);
    for (const [action, method] of Object.entries(actions)) {
      ipcMain.handle(`${name}:${action}`, async (event, payload) => {
        try {
          const result = await instance[method](payload);
          return { success: true, result };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Error in ${name}:${action}] - ${errorMessage}`);
          return { success: false, error: errorMessage };
        }
      });
    }
  }
}

export type { Channels } from '@shared/ipc-channels';
