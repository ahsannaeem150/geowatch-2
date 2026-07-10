import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useSearchCategories() {
  const [domains, setDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [domainsRes, catsRes] = await Promise.all([api.getDomains(), api.getCategories()]);
        if (cancelled) return;
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
          }))
        );
        setCategories(rawCats);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load categories');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { domains, categories, loading, error };
}
