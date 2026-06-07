import { useEffect, useRef, useState } from 'react';

export const useSse = () => {
  const [lastAlert, setLastAlert] = useState(null);
  const [lastMetrics, setLastMetrics] = useState(null);
  const esRef = useRef(null);
  
  useEffect(() => {
    const connect = () => {
      // Use absolute path for SSE
      const es = new EventSource('/api/events');
      esRef.current = es;
      
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'alert') {
            setLastAlert(data.data);
          } else if (data.type === 'metrics') {
            setLastMetrics(data.data);
          }
        } catch (_) {}
      };
      
      es.onerror = () => {
        es.close();
        setTimeout(connect, 5000);
      };
    };
    
    connect();
    return () => esRef.current?.close();
  }, []);
  
  return { lastAlert, lastMetrics };
};
