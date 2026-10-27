import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1000;
const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

async function readCount(key: string): Promise<number> {
  if (Platform.OS === 'web') {
    return Number(localStorage.getItem(countKey(key)) ?? 0);
  }
  return Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    const count = await readCount(key);
    for (let i = 0; i < count; i++) {
      localStorage.removeItem(chunkKey(key, i));
    }
    localStorage.removeItem(countKey(key));
    localStorage.removeItem(key);
    return;
  }

  const count = await readCount(key);
  for (let i = 0; i < count; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
  await SecureStore.deleteItemAsync(countKey(key));
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      const count = await readCount(key);
      if (count === 0) {
        return localStorage.getItem(key) ?? null;
      }
      let value = '';
      for (let i = 0; i < count; i++) {
        const chunk = localStorage.getItem(chunkKey(key, i));
        if (chunk === null) return null;
        value += chunk;
      }
      return value;
    }

    const count = await readCount(key);
    if (count === 0) {
      // Intento directo en caso de existir sin fragmentos
      const direct = await SecureStore.getItemAsync(key);
      return direct ?? null;
    }

    let value = '';
    for (let i = 0; i < count; i++) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
      if (chunk === null) return null; // sesión incompleta
    }
    return value;
  },

  async setItem(key: string, value: string): Promise<void> {
    await removeItem(key);

    if (Platform.OS === 'web') {
      const total = Math.ceil(value.length / CHUNK_SIZE);
      for (let i = 0; i < total; i++) {
        localStorage.setItem(
          chunkKey(key, i),
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        );
      }
      localStorage.setItem(countKey(key), String(total));
      return;
    }

    const total = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      await SecureStore.setItemAsync(
        chunkKey(key, i),
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
    await SecureStore.setItemAsync(countKey(key), String(total));
  },

  removeItem,
};

