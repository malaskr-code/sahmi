"use client";

import { useCallback, useEffect, useState } from "react";
import { getProduct, getProducts, ProductRequestError, type Product } from "./products";

// One client data helper for every product-reading page, including saved carts.
export function useProducts(id?: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(id !== null);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (id === null) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setNotFound(false);
    const load = id === undefined
      ? getProducts(controller.signal)
      : getProduct(id, controller.signal).then(product => [product]);
    load.then(setProducts).catch(reason => {
      if (controller.signal.aborted) return;
      setProducts([]);
      setError(true);
      setNotFound(reason instanceof ProductRequestError && reason.status === 404);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  return { products, product: products[0], loading, error, notFound, retry };
}
