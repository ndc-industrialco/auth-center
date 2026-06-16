import { z } from 'zod';

export const createAppSchema = z.object({
  appId: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'appId must be lowercase alphanumeric with hyphens'),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const createRoleGrantSchema = z.object({
  userId: z.string().cuid(),
  appId: z.string().min(1).max(50),
  role: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
});

export const revokeGrantSchema = z.object({
  grantId: z.string().cuid(),
});

export const createDefaultRolePolicySchema = z.object({
  appId: z.string().min(1).max(50),
  role: z.string().min(1).max(100),
  applyTo: z.enum(['ALL', 'ENTRA_ONLY', 'LOCAL_ONLY']).default('ALL'),
  departmentId: z.string().max(100).optional(),
  description: z.string().max(200).optional(),
});

export const createUserSchema = z.object({
  employeeId:      z.string().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/, 'Alphanumeric, hyphens, underscores only'),
  displayName:     z.string().max(200).optional().or(z.literal('')),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  departmentCode:  z.string().max(100).optional().or(z.literal('')),
  department:      z.string().max(200).optional().or(z.literal('')),
  jobTitle:        z.string().max(200).optional().or(z.literal('')),
  initialPassword: z.string().min(5).max(128).optional().or(z.literal('')),
  entraObjectId:   z.string().optional().or(z.literal('')),
  entraUpn:        z.string().email('Invalid UPN').optional().or(z.literal('')),
  groupIds:        z.array(z.string()).optional(),
});

export const updateAvailableRolesSchema = z.object({
  appId: z.string().min(1).max(50),
  roles: z.array(z.string().min(1).max(100)).max(50),
});

export type CreateAppInput = z.infer<typeof createAppSchema>;
export type CreateRoleGrantInput = z.infer<typeof createRoleGrantSchema>;
export type CreateDefaultRolePolicyInput = z.infer<typeof createDefaultRolePolicySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateAvailableRolesInput = z.infer<typeof updateAvailableRolesSchema>;
