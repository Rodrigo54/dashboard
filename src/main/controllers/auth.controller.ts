import { eq } from 'drizzle-orm';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getDb, schema } from '../database/database.module';
import { action, Controller } from './controller.decorator';
import { clearCurrentUser, getCurrentUser, setCurrentUser, type PublicUser } from './session';

@Controller('auth')
export class AuthController {
  @action('check')
  async check(): Promise<{ hasUsers: boolean }> {
    const db = getDb();
    const user = db.select({ id: schema.users.id }).from(schema.users).limit(1).get();
    return { hasUsers: user !== undefined };
  }

  @action('login')
  async login(payload: { email: string; password: string }): Promise<PublicUser> {
    const db = getDb();
    const user = db.select().from(schema.users).where(eq(schema.users.email, payload.email)).get();

    if (!user) throw new Error('Credenciais inválidas');
    if (!user.isActive) throw new Error('Usuário inativo');

    const [salt, storedHex] = user.passwordHash.split(':');
    const inputHex = scryptSync(payload.password, salt, 64).toString('hex');

    if (!timingSafeEqual(Buffer.from(storedHex, 'hex'), Buffer.from(inputHex, 'hex'))) {
      throw new Error('Credenciais inválidas');
    }

    const { passwordHash: _, ...publicUser } = user;
    setCurrentUser(publicUser);
    return publicUser;
  }

  @action('register')
  async register(payload: { name: string; email: string; password: string }): Promise<PublicUser> {
    const db = getDb();
    const existing = db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, payload.email))
      .get();

    if (existing) throw new Error('E-mail já cadastrado');

    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(payload.password, salt, 64).toString('hex');
    const passwordHash = `${salt}:${hash}`;

    const newUser = db
      .insert(schema.users)
      .values({ name: payload.name, email: payload.email, passwordHash })
      .returning()
      .get();

    const { passwordHash: _, ...publicUser } = newUser;
    setCurrentUser(publicUser);
    return publicUser;
  }

  @action('logout')
  async logout(): Promise<void> {
    clearCurrentUser();
  }

  @action('me')
  async me(): Promise<PublicUser | null> {
    return getCurrentUser();
  }
}
