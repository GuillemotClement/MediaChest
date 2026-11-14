import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';

export const mediaTypeEnum = pgEnum('media_type', ['film', 'serie']);
export const mediaStatusEnum = pgEnum('status', ['En attente', 'Télécharger', 'Disponible']);

export const media = pgTable('media', {
  id: serial().primaryKey(),
  tmdbId: varchar('tmdb_id').notNull().unique(),
  name: varchar('name').notNull(),
  mediaType: mediaTypeEnum('type').notNull(),
  status: mediaStatusEnum('status').default('En attente'),
});

// TODO: ajout de la gestion de l'unicité

export const mediaUser = pgTable(
  'media_user',
  {
    id: serial().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mediaId: integer('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  // ajout de la contrainte d'unicite
  (t) => [unique('media_user_user_id_media_id_unique').on(t.userId, t.mediaId)],
);
