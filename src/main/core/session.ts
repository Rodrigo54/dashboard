import type { schema } from '../database/database.module';

/** Usuário autenticado sem o hash de senha — formato exposto pela ponte de IPC. */
export type PublicUser = Omit<schema.User, 'passwordHash'>;

/** Remove a credencial de uma linha de `users` antes de expô-la via IPC. */
export function toPublicUser(user: schema.User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

// Sessão única do processo main. Compartilhada entre controllers (auth grava,
// os demais leem para resolver o `userId` do usuário atual) em vez de viver
// privada dentro de um único controller.
let currentUser: PublicUser | null = null;

/** Retorna o usuário autenticado, ou `null` se não houver sessão. */
export function getCurrentUser(): PublicUser | null {
  return currentUser;
}

/** Define o usuário autenticado (login/register). */
export function setCurrentUser(user: PublicUser): void {
  currentUser = user;
}

/** Limpa a sessão (logout). */
export function clearCurrentUser(): void {
  currentUser = null;
}

/** Retorna o usuário autenticado ou lança quando não há sessão ativa. */
export function requireCurrentUser(): PublicUser {
  if (!currentUser) throw new Error('Nenhum usuário autenticado');
  return currentUser;
}
