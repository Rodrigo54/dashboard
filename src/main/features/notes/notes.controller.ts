import { createNoteSchema } from '@shared/schemas';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '../../database/database.module';
import { Controller, create, list } from '../../core/controller.decorator';
import { requireCurrentUser } from '../../core/session';

/**
 * Notas do usuário autenticado. Escopado por `requireCurrentUser()` — cada
 * usuário só enxerga e cria as próprias notas — e com o payload de criação
 * validado por Zod (`createNoteSchema`).
 */
@Controller('notes')
export class NotesController {
  @list
  async findAll(): Promise<schema.Note[]> {
    const user = requireCurrentUser();
    const db = getDb();
    return db
      .select()
      .from(schema.notes)
      .where(eq(schema.notes.userId, user.id))
      .orderBy(desc(schema.notes.createdAt))
      .all();
  }

  @create
  async create(rawData: unknown): Promise<schema.Note> {
    const data = createNoteSchema.parse(rawData);
    const user = requireCurrentUser();
    const db = getDb();
    return db
      .insert(schema.notes)
      .values({ ...data, userId: user.id })
      .returning()
      .get();
  }
}
