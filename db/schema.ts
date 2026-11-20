import { pgTable, text, timestamp, uuid, index, integer, jsonb, bigint, boolean } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
 id: text().primaryKey(), name: text().notNull(), email: text().notNull(), phone: text().unique(), welcomeSeen: boolean('welcome_seen').default(false).notNull(),
 created: timestamp({withTimezone:true}).defaultNow().notNull(), last: timestamp({withTimezone:true}).defaultNow().notNull()
});
export const orders = pgTable('orders', {
 id: uuid().defaultRandom().primaryKey(), uid: text().notNull().references(()=>users.id),
 name: text().notNull(), contact: text().notNull(), service: text().notNull(), details: text().notNull(),
 status: text().default('جديد').notNull(), t: timestamp({withTimezone:true}).defaultNow().notNull()
}, t=>[index('orders_uid_idx').on(t.uid)]);
export const messages = pgTable('messages', {
 id: uuid().defaultRandom().primaryKey(), uid: text().notNull().references(()=>users.id),
 from: text().notNull(), name: text().notNull(), text: text().notNull(),
 audioKey: text('audio_key'), audioType: text('audio_type'), audioSeconds: integer('audio_seconds'),
 t: timestamp({withTimezone:true}).defaultNow().notNull()
}, t=>[index('messages_uid_time_idx').on(t.uid,t.t)]);
// Public verification material only. Private keys and biometric data stay on the device.
export const passkeys = pgTable('passkeys', {
 id: text().primaryKey(), uid: text().notNull().references(()=>users.id),
 publicKey: text('public_key').notNull(), counter: bigint({mode:'number'}).notNull().default(0),
 transports: jsonb().$type<string[]>().notNull().default([]), name: text().notNull(),
 rpId: text('rp_id').notNull(), created: timestamp({withTimezone:true}).defaultNow().notNull(),
 last: timestamp({withTimezone:true})
}, t=>[index('passkeys_uid_idx').on(t.uid)]);
export const challenges = pgTable('auth_challenges', {
 id: uuid().defaultRandom().primaryKey(), challenge: text().notNull(),
 uid: text(), purpose: text().notNull(), origin: text().notNull(),
 expires: timestamp({withTimezone:true}).notNull()
});
export const sessions = pgTable('passkey_sessions', {
 hash: text().primaryKey(), credentialId: text('credential_id').notNull().references(()=>passkeys.id,{onDelete:'cascade'}),
 uid: text().notNull().references(()=>users.id), expires: timestamp({withTimezone:true}).notNull()
}, t=>[index('passkey_sessions_uid_idx').on(t.uid)]);
export const activity = pgTable('activity', {
 id: uuid().defaultRandom().primaryKey(), uid: text(), email: text(),
 visitor: text(), event: text().notNull(), page: text(), method: text(),
 browser: text(), device: text(), platform: text(),
 t: timestamp({withTimezone:true}).defaultNow().notNull()
}, t=>[index('activity_time_idx').on(t.t,t.id),index('activity_uid_idx').on(t.uid)]);
export const limits = pgTable('request_limits', {
 key: text().primaryKey(), count: integer().notNull().default(1), expires: timestamp({withTimezone:true}).notNull()
});

export const appContent = pgTable("app_content", {
 id: text().primaryKey(), data: jsonb().notNull(), updated: timestamp({withTimezone:true}).defaultNow().notNull()
});

// Independent app access: Identity refresh cannot reopen an expired app session.
export const appSessions = pgTable('app_sessions', {
 hash: text().primaryKey(), uid: text().notNull().references(()=>users.id), source: text().notNull(),
 binding: text().notNull(), hiddenAt: timestamp('hidden_at',{withTimezone:true}),
 lastSeen: timestamp('last_seen',{withTimezone:true}).defaultNow().notNull(),
 created: timestamp({withTimezone:true}).defaultNow().notNull(), expires: timestamp({withTimezone:true}).notNull()
}, t=>[index('app_sessions_uid_idx').on(t.uid)]);

// Provider-generated codes are never stored here. Only a short-lived verification reference.
export const phoneChallenges = pgTable('phone_challenges', {
 id: uuid().defaultRandom().primaryKey(), phone: text().notNull(),
 verificationSid: text('verification_sid').notNull().unique(), binding: text().notNull(),
 name: text().notNull(), attempts: integer().default(0).notNull(),
 expires: timestamp({withTimezone:true}).notNull()
});
