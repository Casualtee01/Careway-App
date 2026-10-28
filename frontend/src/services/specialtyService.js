import api from './api';

export const specialtyService = {
  async list() { return (await api.get('/specialties')).data.data; }
};
