import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { subscribeTaxonomyEvents } from '@shared/services/taxonomy-events.js';

export function useSearchCategories() {
  const [domains, setDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [domainsRes, catsRes] = await Promise.all([api.getDomains(), api.getCategories()]);
      const rawDomains = domainsRes.data?.domains || [];
      const rawCats = catsRes.data?.categories || [];
      const catMap = {};
      rawCats.forEach((c) => {
        const domainSlug = c.domain_slug || c.domainSlug;
        if (!domainSlug) return;
        if (!catMap[domainSlug]) catMap[domainSlug] = [];
        catMap[domainSlug].push({ id: c.id, name: c.name, slug: c.slug });
      });
      setDomains(
        rawDomains.map((d) => ({
          ...d,
          lightColor: d.light_color || d.lightColor || d.color,
          categories: catMap[d.slug] || [],
        })),
      );
      setCategories(rawCats);
      setError(null);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load categories');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return subscribeTaxonomyEvents(() => load({ silent: true }));
  }, [load]);

  return { domains, categories, loading, error, retry: load };
}
