import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useStaffSavedIncidents() {
  const [savedIncidents, setSavedIncidents] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStaffSavedIncidents();
      const incidents = res.data?.incidents || [];
      setSavedIncidents(incidents);
      setSavedIds(new Set(incidents.map((i) => i.id)));
    } catch (err) {
      setError(err.message || 'Failed to load saved incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveIncident = useCallback(async (id, notes) => {
    try {
      await api.saveIncidentForStaff(id, notes);
      setSavedIds((prev) => new Set(prev).add(id));
      await fetchSaved();
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save incident', err);
      return false;
    }
  }, [fetchSaved]);

  const unsaveIncident = useCallback(async (id) => {
    try {
      await api.unsaveIncidentForStaff(id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSavedIncidents((prev) => prev.filter((i) => i.id !== id));
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to unsave incident', err);
      return false;
    }
  }, []);

  const toggleSaved = useCallback(
    async (id, notes) => {
      if (savedIds.has(id)) {
        return unsaveIncident(id);
      }
      return saveIncident(id, notes);
    },
    [savedIds, saveIncident, unsaveIncident]
  );

  const isSaved = useCallback((id) => savedIds.has(id), [savedIds]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  return {
    savedIncidents,
    savedIds,
    loading,
    error,
    fetchSaved,
    saveIncident,
    unsaveIncident,
    toggleSaved,
    isSaved,
  };
}
