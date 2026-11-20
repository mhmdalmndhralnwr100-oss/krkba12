import type { UserLoginEvent, UserModifiedEvent, UserDeletedEvent } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/client.mjs';

// Only verified platform lifecycle events reach these handlers; there is no HTTP handler.
export default {
 async userLogin(event: UserLoginEvent) {
  const user=event.user;
  await db.insert(schema.activity).values({uid:user.id,email:user.email||null,event:'login_success',method:'identity'});
 },
 async userModified(event: UserModifiedEvent) {
  // Account recovery, email/role changes, and blocking revoke independent credentials.
  // Re-enrollment requires a fresh Identity session on the server.
  await db.delete(schema.passkeys).where(eq(schema.passkeys.uid,event.user.id));
  await db.insert(schema.activity).values({uid:event.user.id,email:event.user.email||null,event:'account_changed',method:'identity'});
 },
 async userDeleted(event: UserDeletedEvent) {
  await db.delete(schema.passkeys).where(eq(schema.passkeys.uid,event.user.id));
  await db.insert(schema.activity).values({uid:event.user.id,email:event.user.email||null,event:'account_deleted',method:'identity'});
 }
};
