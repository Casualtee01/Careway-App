import api from './api';

export const adminService = {
  async dashboard() { return (await api.get('/admin/dashboard')).data.data; },
  async users(params = {}) { return (await api.get('/admin/users', { params })).data.data; },
  async setUserStatus(id, isActive) { return (await api.patch(`/admin/users/${id}/status`, { isActive })).data.data.user; },
  async doctors(params = {}) { return (await api.get('/admin/doctors', { params })).data.data; },
  async approveDoctor(id) { return (await api.patch(`/admin/doctors/${id}/approve`)).data.data.doctorProfile; },
  async rejectDoctor(id) { return (await api.patch(`/admin/doctors/${id}/reject`)).data.data.doctorProfile; },
  async appointment(id) { return (await api.get(`/admin/appointments/${id}`)).data.data.appointment; },
  async specialties() { return (await api.get('/specialties')).data.data; },
  async createSpecialty(payload) { return (await api.post('/admin/specialties', payload)).data.data; },
  async updateSpecialty(id, payload) { return (await api.patch(`/admin/specialties/${id}`, payload)).data.data; },
  async deactivateSpecialty(id) { return (await api.delete(`/admin/specialties/${id}`)).data.data; }
};
