import { type Product } from '../schema';

const STORAGE_KEY = 'mitienda_products_web_v1';

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mitienda_products_changed'));
  }
}

function loadLocalProducts(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return list.map((item: any) => ({
      ...item,
      updatedAt: new Date(item.updatedAt),
      syncedAt: item.syncedAt ? new Date(item.syncedAt) : null,
      deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
    }));
  } catch (err) {
    console.error('Error leyendo productos de localStorage en web:', err);
    return [];
  }
}

function saveLocalProducts(products: Product[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    notifyChange();
  } catch (err) {
    console.error('Error guardando productos en localStorage en web:', err);
  }
}

function generateUUID(): string {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
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
  liveQuery: null,

  async getAll(): Promise<Product[]> {
    const all = loadLocalProducts();
    return all
      .filter((p) => !p.deletedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async getById(id: number): Promise<Product | undefined> {
    const all = loadLocalProducts();
    return all.find((p) => p.id === id);
  },

  async getByClientId(clientId: string): Promise<Product | undefined> {
    const all = loadLocalProducts();
    return all.find((p) => p.clientId === clientId);
  },

  async create(data: { name: string; quantity: number; price: number }): Promise<Product> {
    const all = loadLocalProducts();
    const nextId = all.length > 0 ? Math.max(...all.map((p) => p.id)) + 1 : 1;
    const now = new Date();

    const newProd: Product = {
      id: nextId,
      clientId: generateUUID(),
      name: data.name.trim(),
      quantity: Math.floor(Math.max(0, data.quantity)),
      price: Math.floor(Math.max(0, data.price)),
      updatedAt: now,
      syncedAt: null,
      deletedAt: null,
    };

    all.push(newProd);
    saveLocalProducts(all);
    return newProd;
  },

  async update(
    id: number,
    data: { name: string; quantity: number; price: number }
  ): Promise<Product | undefined> {
    const all = loadLocalProducts();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    const now = new Date();
    all[index] = {
      ...all[index],
      name: data.name.trim(),
      quantity: Math.floor(Math.max(0, data.quantity)),
      price: Math.floor(Math.max(0, data.price)),
      updatedAt: now,
    };

    saveLocalProducts(all);
    return all[index];
  },

  async delete(id: number): Promise<boolean> {
    const all = loadLocalProducts();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) return false;

    const now = new Date();
    all[index] = {
      ...all[index],
      deletedAt: now,
      updatedAt: now,
    };

    saveLocalProducts(all);
    return true;
  },

  async getPending(): Promise<Product[]> {
    const all = loadLocalProducts();
    return all.filter((p) => isProductPending(p));
  },

  async markSynced(clientId: string, syncedAt: Date): Promise<void> {
    const all = loadLocalProducts();
    const index = all.findIndex((p) => p.clientId === clientId);
    if (index !== -1) {
      all[index].syncedAt = syncedAt;
      saveLocalProducts(all);
    }
  },

  async purgeDeleted(clientId: string): Promise<void> {
    const all = loadLocalProducts();
    const filtered = all.filter((p) => p.clientId !== clientId);
    saveLocalProducts(filtered);
  },

  async upsertFromRemote(remote: {
    client_id: string;
    name: string;
    quantity: number;
    price: number;
    updated_at: string;
    deleted_at?: string | null;
  }): Promise<'inserted' | 'updated' | 'skipped'> {
    const all = loadLocalProducts();
    const index = all.findIndex((p) => p.clientId === remote.client_id);
    const remoteUpdatedAt = new Date(remote.updated_at);

    if (index === -1) {
      if (remote.deleted_at) {
        return 'skipped';
      }
      const nextId = all.length > 0 ? Math.max(...all.map((p) => p.id)) + 1 : 1;
      all.push({
        id: nextId,
        clientId: remote.client_id,
        name: remote.name,
        quantity: remote.quantity,
        price: remote.price,
        updatedAt: remoteUpdatedAt,
        syncedAt: remoteUpdatedAt,
        deletedAt: null,
      });
      saveLocalProducts(all);
      return 'inserted';
    }

    const localUpdatedAt = new Date(all[index].updatedAt);
    if (remoteUpdatedAt.getTime() > localUpdatedAt.getTime()) {
      if (remote.deleted_at) {
        const filtered = all.filter((p) => p.clientId !== remote.client_id);
        saveLocalProducts(filtered);
        return 'updated';
      }
      all[index] = {
        ...all[index],
        name: remote.name,
        quantity: remote.quantity,
        price: remote.price,
        updatedAt: remoteUpdatedAt,
        syncedAt: remoteUpdatedAt,
        deletedAt: null,
      };
      saveLocalProducts(all);
      return 'updated';
    }

    return 'skipped';
  },
};

