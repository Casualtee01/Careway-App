import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { doctorService } from './doctorService';

vi.mock('./api', () => ({ default: { get: vi.fn() } }));

describe('doctorService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the backend doctor-search route and forwards its query filters', async () => {
    api.get.mockResolvedValue({ data: { data: { data: [], pagination: { page: 1, total: 0 } } } });
    const result = await doctorService.search({ specialty: 'specialty-id', availableDate: '2026-10-28' });
    expect(api.get).toHaveBeenCalledWith('/doctors', { params: { specialty: 'specialty-id', availableDate: '2026-10-28' } });
    expect(result.pagination.total).toBe(0);
  });

  it('requests availability by the backend date query parameter', async () => {
    api.get.mockResolvedValue({ data: { data: { date: '2026-10-28', slots: [] } } });
    await doctorService.getAvailability('doctor-id', '2026-10-28');
    expect(api.get).toHaveBeenCalledWith('/doctors/doctor-id/availability', { params: { date: '2026-10-28' } });
  });
});
