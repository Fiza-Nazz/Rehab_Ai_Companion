import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['patient', 'doctor', 'caregiver']),
});

export const checkinSchema = z.object({
  pain_score: z.number().min(1).max(10),
  fatigue_score: z.number().min(1).max(10),
  mobility_score: z.number().min(1).max(10),
  mood_score: z.number().min(1).max(10),
  notes: z.string().optional(),
});
