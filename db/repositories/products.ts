import { desc, eq, isNull, or, lt } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { db } from '../client';
import { products, type Product, type NewProduct } from '../schema';

function generateUUID(): string {
  try {
    if (Crypto && typeof Crypto.randomUUID === 'function') {
      return Crypto.randomUUID();
    }
  } catch {
    // Fallback seguro
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isProductPending(product: Product): boolean {
  if (!product.syncedAt) return true;
  const syncedTime = new Date(product.syncedAt).getTime();
  const updatedTime = new Date(product.updatedAt).getTime();
  return syncedTime < updatedTime;
}

export const productsRepo = {
  // Query base reactiva para useLiveQuery en la pantalla principal
  liveQuery: db
    .select()
    .from(products)
    .where(isNull(products.deletedAt))
    .orderBy(desc(products.updatedAt)),

  async getAll(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.updatedAt));
  },

  async getById(id: number): Promise<Product | undefined> {
    const results = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return results[0];
  },

  async getByClientId(clientId: string): Promise<Product | undefined> {
    const results = await db
      .select()
      .from(products)
      .where(eq(products.clientId, clientId))
      .limit(1);
    return results[0];
  },

  async create(data: { name: string; quantity: number; price: number }): Promise<Product> {
    const now = new Date();
    const clientId = generateUUID();

    const inserted = await db
      .insert(products)
      .values({
        clientId,
        name: data.name.trim(),
        quantity: Math.floor(Math.max(0, data.quantity)),
        price: Math.floor(Math.max(0, data.price)),
        updatedAt: now,
        syncedAt: null,
      })
      .returning();

    return inserted[0];
  },

  async update(
    id: number,
    data: { name: string; quantity: number; price: number }
  ): Promise<Product | undefined> {
    const now = new Date();
    const updated = await db
      .update(products)
      .set({
        name: data.name.trim(),
        quantity: Math.floor(Math.max(0, data.quantity)),
        price: Math.floor(Math.max(0, data.price)),
        updatedAt: now,
      })
      .where(eq(products.id, id))
      .returning();

    return updated[0];
  },

  // Borrado con borrado lógico (deletedAt) para permitir sincronización
  async delete(id: number): Promise<boolean> {
    const now = new Date();
    const result = await db
      .update(products)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(products.id, id))
      .returning();

    return result.length > 0;
  },

  // Obtiene los productos pendientes de sincronizar
  async getPending(): Promise<Product[]> {
    const all = await db.select().from(products);
    return (all as Product[]).filter((p: Product) => isProductPending(p));
  },

  // Marca un producto como sincronizado
  async markSynced(clientId: string, syncedAt: Date): Promise<void> {
    await db
      .update(products)
      .set({ syncedAt })
      .where(eq(products.clientId, clientId));
  },

  // Elimina físicamente si ya se sincronizó el borrado en la nube
  async purgeDeleted(clientId: string): Promise<void> {
    await db.delete(products).where(eq(products.clientId, clientId));
  },

  // Insertar o actualizar producto traído de la nube (con regla gana el último cambio)
  async upsertFromRemote(remote: {
    client_id: string;
    name: string;
    quantity: number;
    price: number;
    updated_at: string;
    deleted_at?: string | null;
  }): Promise<'inserted' | 'updated' | 'skipped'> {
    const existing = await productsRepo.getByClientId(remote.client_id);
    const remoteUpdatedAt = new Date(remote.updated_at);

    if (!existing) {
      if (remote.deleted_at) {
        return 'skipped';
      }
      await db.insert(products).values({
        clientId: remote.client_id,
        name: remote.name,
        quantity: remote.quantity,
        price: remote.price,
        updatedAt: remoteUpdatedAt,
        syncedAt: remoteUpdatedAt,
      });
      return 'inserted';
    }

    // Regla de conflicto: "Gana el último cambio"
    const localUpdatedAt = new Date(existing.updatedAt);
    if (remoteUpdatedAt.getTime() > localUpdatedAt.getTime()) {
      if (remote.deleted_at) {
        await productsRepo.purgeDeleted(remote.client_id);
        return 'updated';
      }
      await db
        .update(products)
        .set({
          name: remote.name,
          quantity: remote.quantity,
          price: remote.price,
          updatedAt: remoteUpdatedAt,
          syncedAt: remoteUpdatedAt,
          deletedAt: null,
        })
        .where(eq(products.clientId, remote.client_id));
      return 'updated';
    }

    return 'skipped';
  },
};

