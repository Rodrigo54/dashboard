import { ipcMain } from 'electron';
import { getControllerActions, getControllerName } from './controller.decorator.js';
import { PingController } from './ping.controller.js';

const controllers = [PingController];

export function initControllers() {

  for (const Controller of controllers) {
    const instance = new Controller() as unknown as Record<string | symbol, (...args: any[]) => Promise<any>>;
    const name = getControllerName(Controller);
    const actions = getControllerActions(Controller);
    for (const [action, method] of Object.entries(actions)) {
      ipcMain.handle(`${name}:${action}`, async (event, ...args) => {
        try {
          const result = await instance[method](...args);
          return { success: true, result };
        } catch (error) {
          console.error(`Error in ${name}.${action}:`, error);
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      });
    }
  }

}

export type { Channels } from '../../shared/ipc-channels.js';
