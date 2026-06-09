import type { Channels } from '@shared/ipc-channels';

/** Envelope padrão devolvido pelos handlers de IPC do processo main. */
export interface IpcResponse<T> {
  success: boolean;
  result: T;
  error?: string;
}

/** Desempacota um `IpcResponse`, lançando quando `success` é falso. */
export function unwrap<T>(res: IpcResponse<T>): T {
  if (!res.success) throw new Error(res.error ?? 'Erro desconhecido');
  return res.result;
}

/** Invoca um canal IPC tipado e já desempacota o `IpcResponse`. */
export async function invoke<T>(channel: Channels, ...args: unknown[]): Promise<T> {
  const res = await window.electron.invoke<IpcResponse<T>>(channel, ...args);
  return unwrap(res);
}
