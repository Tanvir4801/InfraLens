import axios from 'axios';

const api = axios.create({ baseURL: '' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Metrics
export const fetchMetrics       = () => api.get('/api/metrics').then(r => r.data);
export const fetchServers       = () => api.get('/api/servers').then(r => r.data);
export const fetchPrediction    = () => api.get('/api/predict').then(r => r.data);
export const fetchServerHistory = (name) => api.get(`/api/servers/${name}/history`).then(r => r.data);

// Alerts
export const fetchAlerts        = () => api.get('/api/alerts').then(r => r.data.alerts ?? r.data);
export const acknowledgeAlert   = (id) => api.patch(`/api/alerts/${id}/acknowledge`).then(r => r.data);
export const resolveAlert       = (id) => api.patch(`/api/alerts/${id}/resolve`).then(r => r.data);
export const assignAlert        = (id, userId) => api.patch(`/api/alerts/${id}/assign`, { user_id: userId }).then(r => r.data);

// Containers
export const fetchContainers    = () => api.get('/api/containers').then(r => r.data);
export const restartContainer   = (id) => api.post(`/api/containers/${id}/restart`).then(r => r.data);
export const stopContainer      = (id) => api.post(`/api/containers/${id}/stop`).then(r => r.data);
export const fetchContainerLogs = (id) => api.get(`/api/containers/${id}/logs`).then(r => r.data);

// Incidents
export const fetchIncidents     = () => api.get('/api/incidents').then(r => r.data);
export const createIncident     = (data) => api.post('/api/incidents', data).then(r => r.data);
export const updateIncident     = (id, d) => api.patch(`/api/incidents/${id}`, d).then(r => r.data);
export const resolveIncident    = (id) => api.patch(`/api/incidents/${id}/resolve`).then(r => r.data);
export const fetchIncidentTimeline = () => api.get('/api/incidents').then(r => r.data);

// Users
export const fetchUsers         = () => api.get('/api/users').then(r => r.data);
export const createUser         = (d) => api.post('/api/users', d).then(r => r.data);
export const updateUser         = (id, d) => api.patch(`/api/users/${id}`, d).then(r => r.data);
export const deleteUser         = (id) => api.delete(`/api/users/${id}`).then(r => r.data);
export const toggleUser         = (id) => api.patch(`/api/users/${id}/toggle`).then(r => r.data);

// AI
export const aiChat             = (q, ctx) => api.get('/api/chat', { params: { q, ...ctx } }).then(r => r.data);
export const generateRCA        = (alert, metrics) => api.post('/api/incident-report', { alert_data: alert, metrics_data: metrics }).then(r => r.data);
export const fetchCostAnalysis  = () => api.get('/api/cost-analysis').then(r => r.data);
export const fetchTopology      = () => api.get('/api/topology').then(r => r.data);
export const fetchAuditLogs     = () => api.get('/api/audit-logs').then(r => r.data);
export const fetchSessions      = () => api.get('/api/sessions').then(r => r.data);

// Auth
export const login              = (username, password) => api.post('/api/auth/login', { username, password }).then(r => r.data);
export const fetchCurrentUser   = () => api.get('/api/auth/me').then(r => r.data);

export default api;
