import { useState, useEffect } from 'react';
import { fetchMetrics } from '../services/api';

export function useMetrics(intervalMs = 5000) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    let timer;
    const load = async () => {
      try {
        const d = await fetchMetrics();
        setMetrics(d);
        setLastUpdated(0);
        setLoading(false);
      } catch {}
    };
    load();
    const interval = setInterval(load, intervalMs);
    const tick = setInterval(() => setLastUpdated(p => p + 1), 1000);
    return () => { clearInterval(interval); clearInterval(tick); clearTimeout(timer); };
  }, [intervalMs]);

  return { metrics, loading, lastUpdated };
}
