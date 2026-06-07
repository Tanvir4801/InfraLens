export const API_BASE = ''; // relative — CRA proxy handles /api/* → localhost:8000

export const WS_URL = (() => {
  const host = window.location.host;
  const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  if (host.includes('.replit.dev') || host.includes('.repl.co')) {
    const backendHost = host
      .replace('-5000-', '-8000-')
      .replace('-3001-', '-8000-')
      .replace('-3000-', '-8000-');
    return `${wsScheme}://${backendHost}/ws/live`;
  }
  return `${wsScheme}://localhost:8000/ws/live`;
})();
