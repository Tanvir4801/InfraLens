import axios from 'axios';
import { API_BASE } from '../config/constants';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchMetrics = () => api.get('/api/metrics').then(res => res.data);
export const fetchServers = () => api.get('/api/servers').then(res => res.data);
export const fetchAlerts = () => api.get('/api/alerts').then(res => res.data);
export const fetchPrediction = () => api.get('/api/prediction').then(res => res.data);
export const fetchContainerLogs = (id) => api.get(`/api/containers/${id}/logs`).then(res => res.data);
export const restartContainer = (id) => api.post(`/api/containers/${id}/restart`).then(res => res.data);
export const fetchIncidentTimeline = () => api.get('/api/incidents').then(res => res.data);
export const aiChat = (question, context) => api.post('/api/ai-chat', { question, context }).then(res => res.data);
export const generateRCA = (alert, metrics) => api.post('/api/incident-report', { alert, metrics }).then(res => res.data);
export const fetchTopology = () => api.get('/api/topology').then(res => res.data);
export const fetchCostAnalysis = () => api.get('/api/cost-analysis').then(res => res.data);
export const login = (username, password) => api.post('/api/auth/login', { username, password }).then(res => res.data);
export const acknowledgeAlert = (id) => api.patch(`/api/alerts/${id}/acknowledge`).then(res => res.data);
export const fetchServerHistory = (name) => api.get(`/api/servers/${name}/history`).then(res => res.data);

export default api;
