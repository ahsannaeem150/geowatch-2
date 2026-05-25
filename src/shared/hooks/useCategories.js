import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:3000/api/v1';

let cache = null;
let cachePromise = null;

async function fetchCategories() {
  if (cache) return cache;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const res = await fetch(`${API_BASE}/categories`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch categories');

    const categories = data.data.categories;
    const domainsMap = new Map();
    const categoriesByDomain = new Map();
    const categoryById = new Map();
    const categoryBySlug = new Map();

    for (const cat of categories) {
      categoryById.set(cat.id, cat);
      categoryBySlug.set(cat.slug, cat);

      if (!domainsMap.has(cat.domain_id)) {
        domainsMap.set(cat.domain_id, {
          id: cat.domain_id,
          name: cat.domain_name,
          slug: cat.domain_slug,
          color: cat.domain_color,
          icon: cat.domain_icon,
        });
      }

      if (!categoriesByDomain.has(cat.domain_id)) {
        categoriesByDomain.set(cat.domain_id, []);
      }
      categoriesByDomain.get(cat.domain_id).push(cat);
    }

    const domains = Array.from(domainsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    cache = { categories, domains, domainsMap, categoriesByDomain, categoryById, categoryBySlug };
    return cache;
  })();

  return cachePromise;
}

export function useCategories() {
  const [state, setState] = useState({
    categories: [],
    domains: [],
    loading: !cache,
    error: null,
  });

  useEffect(() => {
    if (cache) {
      setState({ categories: cache.categories, domains: cache.domains, loading: false, error: null });
      return;
    }

    let cancelled = false;
    fetchCategories()
      .then((data) => {
        if (cancelled) return;
        setState({ categories: data.categories, domains: data.domains, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ categories: [], domains: [], loading: false, error: err.message });
      });

    return () => { cancelled = true; };
  }, []);

  const getCategoryById = useCallback((id) => {
    return cache?.categoryById.get(id) || null;
  }, []);

  const getCategoryBySlug = useCallback((slug) => {
    return cache?.categoryBySlug.get(slug) || null;
  }, []);

  const getCategoriesByDomain = useCallback((domainId) => {
    return cache?.categoriesByDomain.get(domainId) || [];
  }, []);

  return { ...state, getCategoryById, getCategoryBySlug, getCategoriesByDomain };
}

export { fetchCategories };
