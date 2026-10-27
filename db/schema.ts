import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: text('client_id').notNull().unique(),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp_ms' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export interface Product {
  id: number;
  clientId: string;
  name: string;
  quantity: number;
  price: number;
  updatedAt: Date;
  syncedAt?: Date | null;
  deletedAt?: Date | null;
}

export type NewProduct = Omit<Product, 'id'>;
