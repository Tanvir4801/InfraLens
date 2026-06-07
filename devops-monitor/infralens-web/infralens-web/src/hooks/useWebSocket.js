import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../config/constants';

export function useWebSocket() {
  const [metrics, setMetrics] = useState(null);
  const [connectionState, setConnectionState] = useState('connecting');
  const [rollingHistory, setRollingHistory] = useState([]);
  const wsRef    = useRef(null);
  const retryRef = useRef(null);
  const backoff  = useRef(1000);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => { setConnectionState('connected'); backoff.current = 1000; };
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          setMetrics(d);
          if (d.cpu_percent != null)
            setRollingHistory(p => [...p.slice(-19), d.cpu_percent]);
        } catch {}
      };
      ws.onclose = () => {
        setConnectionState('reconnecting');
        retryRef.current = setTimeout(() => {
          backoff.current = Math.min(backoff.current * 2, 30000);
          connect();
        }, backoff.current);
      };
      ws.onerror = () => { setConnectionState('offline'); ws.close(); };
    } catch { setConnectionState('offline'); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect();
    return () => { clearTimeout(retryRef.current); wsRef.current?.close(); };
  }, [connect]);

  return { metrics, connectionState, rollingHistory };
}
