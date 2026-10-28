import api from './api';

export const notificationService = {
  async list(params = {}) { return (await api.get('/notifications', { params })).data.data; },
  async markRead(id) { return (await api.patch(`/notifications/${id}/read`)).data.data.notification; },
  async markAllRead() { return (await api.patch('/notifications/read-all')).data.data; }
};
