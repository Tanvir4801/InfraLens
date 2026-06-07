import { useState, useEffect, useRef } from 'react';
import { WS_URL } from '../config/constants';

export const useWebSocket = () => {
  const [metrics, setMetrics] = useState(null);
  const [connectionState, setConnectionState] = useState('offline');
  const [rollingHistory, setRollingHistory] = useState([]);
  const reconnectTimeoutRef = useRef(1000);
  const socketRef = useRef(null);

  const connect = () => {
    setConnectionState('reconnecting');
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectionState('connected');
      reconnectTimeoutRef.current = 1000;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMetrics(data);
      setRollingHistory(prev => {
        const newHistory = [...prev, data.cpu_usage || 0];
        return newHistory.slice(-20);
      });
    };

    ws.onclose = () => {
      setConnectionState('offline');
      setTimeout(connect, reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = Math.min(reconnectTimeoutRef.current * 2, 30000);
    };

    ws.onerror = () => {
      ws.close();
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { metrics, connectionState, rollingHistory };
};
