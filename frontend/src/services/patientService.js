import api from './api';

export const patientService = {
  async getProfile() { return (await api.get('/patients/profile')).data.data.user; },
  async updateProfile(payload) { return (await api.patch('/patients/profile', payload)).data.data.user; },
  async listAppointments(params = {}) { return (await api.get('/patients/appointments', { params })).data.data; },
  async getAppointment(id) { return (await api.get(`/patients/appointments/${id}`)).data.data.appointment; }
};
