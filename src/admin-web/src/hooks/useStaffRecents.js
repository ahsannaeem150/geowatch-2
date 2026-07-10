import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useStaffRecents(type = 'incident') {
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStaffRecents(type);
      setRecents(res.data?.recents || []);
    } catch (err) {
      setError(err.message || 'Failed to load recents');
    } finally {
      setLoading(false);
    }
  }, [type]);

  const recordRecent = useCallback(
    async (payload) => {
      try {
        await api.recordStaffRecent(type, payload);
        await fetchRecents();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to record recent', err);
      }
    },
    [type, fetchRecents]
  );

  const clearRecents = useCallback(async () => {
    try {
      await api.clearStaffRecents(type);
      setRecents([]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear recents', err);
    }
  }, [type]);

  useEffect(() => {
    fetchRecents();
  }, [fetchRecents]);

  return {
    recents,
    loading,
    error,
    fetchRecents,
    recordRecent,
    clearRecents,
  };
}
