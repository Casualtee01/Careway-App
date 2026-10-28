import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../services/authService', () => ({
  authService: {
    refresh: vi.fn().mockResolvedValue({}),
    me: vi.fn().mockResolvedValue({ user: { _id: 'doctor-id', name: 'Dr. Lee', role: 'doctor' } }),
    logout: vi.fn()
  }
}));

describe('ProtectedRoute', () => {
  it('redirects an authenticated doctor away from the patient dashboard', async () => {
    render(<MemoryRouter initialEntries={['/patient/dashboard']}><AuthProvider><Routes><Route element={<ProtectedRoute roles={['patient']} />}><Route path="/patient/dashboard" element={<h1>Patient home</h1>} /></Route><Route path="/unauthorized" element={<h1>Unauthorized</h1>} /></Routes></AuthProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Unauthorized' })).toBeInTheDocument());
  });
});
