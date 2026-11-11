import { useState, useEffect, useCallback } from 'react';
import { simulateNetworkRequest } from '../utils/networkSimulation.js';

const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:3100/api/v1';

let cache = null;
let cachePromise = null;

async function fetchZoneCategories() {
  if (cache) return cache;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    await simulateNetworkRequest('/zone-categories');
    const res = await fetch(`${API_BASE}/zone-categories`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch zone categories');

    const categories = data.data.categories;
    const categoryById = new Map();
    const categoryBySlug = new Map();

    for (const cat of categories) {
      categoryById.set(cat.id, cat);
      categoryBySlug.set(cat.slug, cat);
    }

    cache = { categories, categoryById, categoryBySlug };
    return cache;
  })().finally(() => {
    cachePromise = null;
  });

  return cachePromise;
}

export function useZoneCategories() {
  const [state, setState] = useState({
    categories: [],
    loading: !cache,
    error: null,
  });

  useEffect(() => {
    if (cache) {
      setState({ categories: cache.categories, loading: false, error: null });
      return;
    }

    let cancelled = false;
    fetchZoneCategories()
      .then((data) => {
        if (cancelled) return;
        setState({ categories: data.categories, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ categories: [], loading: false, error: err.message });
      });

    return () => { cancelled = true; };
  }, []);

  const retry = useCallback(() => {
    cache = null;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    return fetchZoneCategories()
      .then((data) => {
        setState({ categories: data.categories, loading: false, error: null });
        return data;
      })
      .catch((err) => {
        setState({ categories: [], loading: false, error: err.message });
        throw err;
      });
  }, []);

  const getCategoryById = useCallback((id) => {
    return cache?.categoryById.get(id) || null;
  }, []);

  const getCategoryBySlug = useCallback((slug) => {
    return cache?.categoryBySlug.get(slug) || null;
  }, []);

  return { ...state, retry, getCategoryById, getCategoryBySlug };
}

export function invalidateZoneCategoriesCache() {
  cache = null;
  cachePromise = null;
}
