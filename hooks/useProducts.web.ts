import { useEffect, useMemo, useState } from 'react';
import { productsRepo, isProductPending } from '../db/repositories/products.web';
import type { Product } from '../db/schema';

export function useProducts() {
  const [productList, setProductList] = useState<Product[]>([]);

  const refresh = () => {
    productsRepo.getAll().then(setProductList);
  };

  useEffect(() => {
    refresh();

    if (typeof window !== 'undefined') {
      window.addEventListener('mitienda_products_changed', refresh);
      window.addEventListener('storage', refresh);
      return () => {
        window.removeEventListener('mitienda_products_changed', refresh);
        window.removeEventListener('storage', refresh);
      };
    }
  }, []);

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
    error: undefined,
    stats,
    isProductPending,
    createProduct: productsRepo.create,
    updateProduct: productsRepo.update,
    deleteProduct: productsRepo.delete,
    getById: productsRepo.getById,
  };
}

