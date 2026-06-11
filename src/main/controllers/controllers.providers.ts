import { ipcMain } from 'electron';
import { AccountsController } from './accounts.controller';
import { AppDataController } from './appdata.controller';
import { AuthController } from './auth.controller';
import { getControllerActions, getControllerName } from './controller.decorator';
import { EnvironmentController } from './environment.controller';

const controllers = [AuthController, AppDataController, AccountsController, EnvironmentController];

export function initControllers() {
  for (const Controller of controllers) {
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
