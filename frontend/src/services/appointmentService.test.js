import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { appointmentService } from './appointmentService';

vi.mock('./api', () => ({ default: { post: vi.fn(), patch: vi.fn() } }));

describe('appointmentService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits the backend booking payload and returns the created appointment', async () => {
    const payload = { doctor: 'doctor-id', startAt: '2026-10-28T15:00:00.000Z', appointmentType: 'online', reason: 'Follow-up' };
    api.post.mockResolvedValue({ data: { data: { appointment: { ...payload, status: 'pending' } } } });
    const result = await appointmentService.book(payload);
    expect(api.post).toHaveBeenCalledWith('/appointments', payload);
    expect(result.status).toBe('pending');
  });

  it('sends a cancellation reason to the patient cancellation route', async () => {
    api.patch.mockResolvedValue({ data: { data: { appointment: { _id: 'appointment-id', status: 'cancelled' } } } });
    await appointmentService.cancelPatient('appointment-id', 'Schedule changed');
    expect(api.patch).toHaveBeenCalledWith('/appointments/appointment-id/cancel', { reason: 'Schedule changed' });
  });
});
