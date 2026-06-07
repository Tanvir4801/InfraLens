export const API_BASE = ''; // relative — CRA proxy handles it
export const WS_URL = (() => {
  const host = window.location.host;
  const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // Replit proxies all ports through the same domain using path prefixes
  // For the WebSocket we connect through the same host but port 8000
  if (host.includes('.replit.dev') || host.includes('.repl.co')) {
    // Replit dev domains: replace port segment or use proxy path
    const backendHost = host.replace(/^([^.]+)/, (match) => {
      // Handle both -00- style and direct port style Replit URLs
      if (match.includes('-3001-')) return match.replace('-3001-', '-8000-');
      if (match.includes('-3000-')) return match.replace('-3000-', '-8000-');
      return match;
    });
    return `${wsScheme}://${backendHost}/ws/live`;
  }
  return `${wsScheme}://localhost:8000/ws/live`;
})();
