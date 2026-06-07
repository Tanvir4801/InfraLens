export const API_BASE = ''; // relative — CRA proxy handles it
export const WS_URL = (() => {
  const host = window.location.host;
  const wsHost = host.includes('replit.dev') ? host.replace('-00-', '-00-8000--') : 'localhost:8000';
  const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsScheme}://${wsHost}/ws/live`;
})();
