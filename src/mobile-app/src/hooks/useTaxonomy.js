import { useCallback, useEffect, useState } from 'react';
import { listCategories, listZoneCategories } from '../services/taxonomy.service';
import { subscribeTaxonomyEvents } from '../services/taxonomy-events';
import { DOMAINS, ZONE_OVERLAYS } from '../constants';

const FALLBACK_DOMAINS = DOMAINS.map((d) => ({ ...d }));
const FALLBACK_ZONECATS = ZONE_OVERLAYS.map((z) => ({ ...z, id: null }));
let domainsRequest = null;
let zonecatsRequest = null;

function fetchDomains() {
  if (!domainsRequest) {
    domainsRequest = listCategories().finally(() => {
      domainsRequest = null;
    });
  }
  return domainsRequest;
}

function fetchZonecats() {
  if (!zonecatsRequest) {
    zonecatsRequest = listZoneCategories().finally(() => {
      zonecatsRequest = null;
    });
  }
  return zonecatsRequest;
}

export default function useTaxonomy() {
  const [domains, setDomains] = useState(null);
  const [zonecats, setZonecats] = useState(null);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [domainsError, setDomainsError] = useState('');
  const [zonecatsLoading, setZonecatsLoading] = useState(true);
  const [zonecatsError, setZonecatsError] = useState('');

  const loadDomains = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setDomainsLoading(true);
      setDomainsError('');
    }
    try {
      const data = await fetchDomains();
      const seen = new Map();
      (data?.categories || []).forEach((c) => {
        if (c.domain_slug && !seen.has(c.domain_slug)) {
          const fallback = FALLBACK_DOMAINS.find((d) => d.slug === c.domain_slug);
          seen.set(c.domain_slug, {
            slug: c.domain_slug,
            name: c.domain_name,
            code: fallback?.code || c.domain_slug.slice(0, 2),
            color: c.domain_color || fallback?.color || '#9ca3af',
          });
        }
      });
      setDomains([...seen.values()]);
      setDomainsError('');
    } catch (err) {
      if (!silent) setDomainsError(err?.message || 'Domains could not be loaded.');
    } finally {
      if (!silent) setDomainsLoading(false);
    }
  }, []);

  const loadZonecats = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setZonecatsLoading(true);
      setZonecatsError('');
    }
    try {
      const data = await fetchZonecats();
      const cats = (data?.categories || []).map((c) => {
        const fallback = FALLBACK_ZONECATS.find((z) => z.slug === c.slug);
        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          code: fallback?.code || c.slug?.slice(0, 2) || 'zx',
          color: c.color || fallback?.color || '#9ca3af',
        };
      });
      setZonecats(cats);
      setZonecatsError('');
    } catch (err) {
      if (!silent) setZonecatsError(err?.message || 'Zone categories could not be loaded.');
    } finally {
      if (!silent) setZonecatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDomains();
    loadZonecats();
    return subscribeTaxonomyEvents(() => {
      loadDomains({ silent: true });
      loadZonecats({ silent: true });
    });
  }, [loadDomains, loadZonecats]);

  return {
    domainRows: domains || FALLBACK_DOMAINS,
    zonecatRows: zonecats || FALLBACK_ZONECATS,
    domains,
    zonecats,
    domainsLoading,
    domainsError,
    zonecatsLoading,
    zonecatsError,
    retryDomains: () => loadDomains(),
    retryZonecats: () => loadZonecats(),
  };
}
