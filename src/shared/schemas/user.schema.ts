import { z } from 'zod';
import { USER_ROLES } from '../enums';
import { guid, keysOf, timestamps } from './common.schema';

export const userSchema = z.object({
  id: guid(),
  email: z.email(),
  name: z.string().min(1).max(255),
  avatar: z.string().max(500).nullish(),
  role: z.enum(keysOf(USER_ROLES)),
  isActive: z.boolean(),
  ...timestamps,
});

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(255),
  name: z.string().min(1).max(255),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório').max(255),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'A senha atual é obrigatória'),
  newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres').max(255),
});

/** Limite de tamanho do arquivo de avatar (bytes). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Extensões de imagem aceitas para avatar (espelhadas no mime map do main). */
export const AVATAR_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const;

const avatarFileNamePattern = new RegExp(
  `(${AVATAR_EXTENSIONS.map((ext) => ext.replace('.', '\\.')).join('|')})$`,
  'i',
);

export const updateAvatarSchema = z.object({
  fileName: z
    .string()
    .min(1)
    .regex(avatarFileNamePattern, 'Formato não suportado (use PNG, JPG ou WebP)'),
  data: z
    .instanceof(Uint8Array)
    .refine((bytes) => bytes.byteLength > 0, 'Arquivo vazio')
    .refine((bytes) => bytes.byteLength <= AVATAR_MAX_BYTES, 'Imagem muito grande (máximo de 5MB)'),
});
