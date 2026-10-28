import { z } from 'zod';

export const loginSchema = z.object({ email: z.string().email('Enter a valid email address'), password: z.string().min(1, 'Password is required') });
export const patientSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email(), phone: z.string().max(32).optional(), password: z.string().min(10).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/) });
export const doctorRegistrationSchema = patientSchema.extend({ specialty: z.string().optional(), qualifications: z.string().optional(), experienceYears: z.coerce.number().int().min(0).max(80).optional(), clinicName: z.string().max(160).optional(), clinicAddress: z.string().max(500).optional(), consultationFee: z.coerce.number().min(0).optional(), timezone: z.string().min(1).max(100).optional() });
export const bookingSchema = z.object({ appointmentType: z.enum(['in_person', 'online']), reason: z.string().max(2000).optional() });
