import { describe, expect, it } from 'vitest';
import { loginSchema, patientSchema } from './schemas';

describe('authentication form schemas', () => {
  it('requires backend-compatible patient password complexity', () => {
    expect(patientSchema.safeParse({ name: 'Alex Lee', email: 'alex@example.com', password: 'short' }).success).toBe(false);
    expect(patientSchema.safeParse({ name: 'Alex Lee', email: 'alex@example.com', password: 'GoodPass123' }).success).toBe(true);
  });

  it('rejects invalid login email addresses', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success).toBe(false);
  });
});
