import { inject, Injectable } from '@angular/core';
import { invoke } from '@/core/ipc/invoke';
import { AuthService, type PublicUser } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  readonly #auth = inject(AuthService);

  /** Atualiza o nome do usuário logado e sincroniza a sessão do renderer. */
  async updateProfile(name: string): Promise<void> {
    const user = await invoke<PublicUser>('profile:update', { name });
    this.#auth.currentUser.set(user);
  }

  /** Envia os bytes da imagem; o main grava em userData e atualiza o caminho. */
  async updateAvatar(fileName: string, data: Uint8Array): Promise<void> {
    const user = await invoke<PublicUser>('profile:updateAvatar', { fileName, data });
    this.#auth.currentUser.set(user);
  }

  /** Troca a senha exigindo a atual; lança com a mensagem do main em caso de erro. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await invoke<void>('profile:changePassword', { currentPassword, newPassword });
  }
}
