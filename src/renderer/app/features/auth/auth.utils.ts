import type { PublicUser } from './auth.service';

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/**
 * URL do avatar servida pelo protocol handler `avatar://` do main. O parâmetro
 * `v` (updatedAt) força o refetch quando a imagem muda sob o mesmo caminho.
 */
export function avatarUrl(
  user: (Pick<PublicUser, 'id' | 'avatar'> & { updatedAt: string | Date }) | null,
): string {
  if (!user?.avatar) return '';
  return `avatar://user/${user.id}?v=${new Date(user.updatedAt).getTime()}`;
}
