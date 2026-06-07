import { useState, useEffect } from 'react';
import { fetchAlerts } from '../services/api';

export function useAlerts(intervalMs = 30000) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(0);

  const refresh = async () => {
    try {
      const d = await fetchAlerts();
      setAlerts(Array.isArray(d) ? d : d.alerts ?? []);
      setLastUpdated(0);
      setLoading(false);
    } catch {}
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, intervalMs);
    const tick = setInterval(() => setLastUpdated(p => p + 1), 1000);
    return () => { clearInterval(interval); clearInterval(tick); };
  }, [intervalMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { alerts, setAlerts, loading, lastUpdated, refresh };
}
