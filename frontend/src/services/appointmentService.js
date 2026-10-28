import api from './api';

export const appointmentService = {
  async book(payload) { return (await api.post('/appointments', payload)).data.data.appointment; },
  async listPatient(params = {}) { return (await api.get('/appointments/my-appointments', { params })).data.data; },
  async listDoctor(params = {}) { return (await api.get('/doctor/appointments', { params })).data.data; },
  async getDoctor(id) { return (await api.get(`/doctor/appointments/${id}`)).data.data.appointment; },
  async listAdmin(params = {}) { return (await api.get('/admin/appointments', { params })).data.data; },
  async getPatient(id) { return (await api.get(`/appointments/${id}`)).data.data.appointment; },
  async cancelPatient(id, reason) { return (await api.patch(`/appointments/${id}/cancel`, { reason })).data.data.appointment; },
  async acceptDoctor(id) { return (await api.patch(`/doctor/appointments/${id}/accept`)).data.data.appointment; },
  async cancelDoctor(id, reason) { return (await api.patch(`/doctor/appointments/${id}/cancel`, { reason })).data.data.appointment; },
  async completeDoctor(id) { return (await api.patch(`/doctor/appointments/${id}/complete`)).data.data.appointment; },
  async cancelAdmin(id, reason) { return (await api.patch(`/admin/appointments/${id}/cancel`, { reason })).data.data.appointment; }
};
