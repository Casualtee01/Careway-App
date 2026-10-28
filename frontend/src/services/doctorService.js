import api from './api';

export const doctorService = {
  async search(params = {}) { return (await api.get('/doctors', { params })).data.data; },
  async getById(id) { return (await api.get(`/doctors/${id}`)).data.data.doctor; },
  async getAvailability(id, date) { return (await api.get(`/doctors/${id}/availability`, { params: { date } })).data.data; },
  async getProfile() { return (await api.get('/doctor/profile')).data.data.doctorProfile; },
  async updateProfile(payload) { return (await api.patch('/doctor/profile', payload)).data.data.doctorProfile; }
};
