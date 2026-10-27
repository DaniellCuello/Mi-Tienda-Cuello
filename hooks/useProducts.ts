import { useMemo } from 'react';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { productsRepo, isProductPending } from '../db/repositories/products';
import type { Product } from '../db/schema';

export function useProducts() {
  const { data, error } = useLiveQuery(productsRepo.liveQuery);

  const productList: Product[] = useMemo(() => {
    return (data as Product[]) ?? [];
  }, [data]);

  const stats = useMemo(() => {
    let totalUnits = 0;
    let totalValue = 0;
    let pendingCount = 0;

    for (const item of productList) {
      totalUnits += item.quantity;
      totalValue += item.quantity * item.price;
      if (isProductPending(item)) {
        pendingCount += 1;
      }
    }

    return {
      totalUnits,
      totalValue,
      pendingCount,
    };
  }, [productList]);

  return {
    products: productList,
    error,
    stats,
    isProductPending,
    createProduct: productsRepo.create,
    updateProduct: productsRepo.update,
    deleteProduct: productsRepo.delete,
    getById: productsRepo.getById,
  };
}

