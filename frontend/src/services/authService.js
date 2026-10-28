import api, { setAccessToken } from './api';

export const authService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    setAccessToken(data.data.accessToken);
    return data.data.user;
  },
  async refresh() {
    const { data } = await api.post('/auth/refresh');
    setAccessToken(data.data.accessToken);
    return data.data.user;
  },
  async me() {
    const { data } = await api.get('/auth/me');
    return data.data;
  },
  async logout() {
    try { await api.post('/auth/logout'); } finally { setAccessToken(null); }
  },
  async registerPatient(payload) {
    const { data } = await api.post('/auth/register/patient', payload);
    return data.data;
  },
  async registerDoctor(payload) {
    const { data } = await api.post('/auth/register/doctor', payload);
    return data.data;
  }
};
