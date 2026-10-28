import api from './api';

export const availabilityService = {
  async getMine() { return (await api.get('/doctor/availability')).data.data; },
  async update(payload) { return (await api.put('/doctor/availability', payload)).data.data; }
};
