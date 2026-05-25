import axios from 'axios'

const api = axios.create({
  baseURL: '/api/queue',
  headers: { 'Content-Type': 'application/json' },
})

export const queueApi = {
  getState: () => api.get('/state'),
  addVehicle: (payload) => api.post('/add', payload),
  serveNext: () => api.post('/serve'),
  serveById: (id) => api.post(`/serve/${encodeURIComponent(id)}`),
  setMode: (isAutoMode) => api.post('/mode', { isAutoMode }),
  moveToRamp: () => api.post('/move-to-ramp'),
  clearAll: () => api.delete('/clear'),
}