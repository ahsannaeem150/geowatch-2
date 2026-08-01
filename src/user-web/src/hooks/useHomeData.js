import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

/**
 * useHomeData — ONE consolidated data source for the home page.
 *
 * The list endpoint's default window is "visible today" when no date params
 * are sent, so a single getIncidents call covers every consumer (verified:
 * no-params, status=active, and today's explicit window all return the same
 * dataset). Derivations are client-side and keep each consumer's output
 * identical to its old dedicated fetch:
 *   NewsTicker     → activeIncidents sorted by start_date (top 10)
 *   HeroMap        → activeIncidents (markers)
 *   StatsSection   → stats { active, today, countries, sources }
 *   CategoryGrid   → domains, categories, domainCounts (active per domain)
 *   FeaturedEvents → activeIncidents sorted by severity/start_date (top 6)
 *
 * Module-level cache: any number of consumers still fire one fetch per load.
 */

let cache = null;
let cachePromise = null;

function fetchHomeData() {
  if (cache) return Promise.resolve(cache);
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const [incidentsRes, domainsRes, categoriesRes] = await Promise.all([
      api.getIncidents({}),
      api.getDomains().catch(() => ({ data: { domains: [] } })),
      api.getCategories().catch(() => ({ data: { categories: [] } })),
    ]);

    const incidents = incidentsRes.data?.incidents || [];
    const totalToday = incidentsRes.data?.count ?? incidents.length;
    const domains = domainsRes.data?.domains || [];
    const categories = categoriesRes.data?.categories || [];

    const activeIncidents = incidents.filter((i) => i.status === 'active');

    const countries = new Set(
      incidents.map((i) => i.location_context?.split(',').pop()?.trim()).filter(Boolean)
    ).size;
    const sources = new Set(incidents.map((i) => i.source_name).filter(Boolean)).size;

    const domainCounts = {};
    activeIncidents.forEach((inc) => {
      const cat = categories.find((c) => c.id === inc.category_id);
      if (cat) domainCounts[cat.domain_id] = (domainCounts[cat.domain_id] || 0) + 1;
    });

    cache = {
      incidents,
      activeIncidents,
      stats: { active: activeIncidents.length, today: totalToday, countries, sources },
      domains,
      categories,
      domainCounts,
    };
    return cache;
  })();

  // A failure clears the promise so the next consumer retries
  cachePromise.catch(() => {
    cachePromise = null;
  });
  return cachePromise;
}

const EMPTY = {
  incidents: [],
  activeIncidents: [],
  stats: { active: 0, today: 0, countries: 0, sources: 0 },
  domains: [],
  categories: [],
  domainCounts: {},
};

export function useHomeData() {
  const [state, setState] = useState(() =>
    cache ? { loading: false, error: null, ...cache } : { loading: true, error: null, ...EMPTY }
  );

  useEffect(() => {
    if (cache) {
      setState({ loading: false, error: null, ...cache });
      return;
    }
    let cancelled = false;
    fetchHomeData()
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, ...data });
      })
      .catch((err) => {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false, error: err }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
