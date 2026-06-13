import { describe, it, expect, vi, beforeEach } from 'vitest';
import { permissionService } from '@/services/permissionService';

vi.mock('@/repositories/roleGrantRepository', () => ({
  roleGrantRepository: {
    findActiveByUserAndApp: vi.fn(),
  },
}));

import { roleGrantRepository } from '@/repositories/roleGrantRepository';

describe('PermissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns role names for active grants', async () => {
    vi.mocked(roleGrantRepository.findActiveByUserAndApp).mockResolvedValue([
      { role: 'QMS_ADMIN' } as never,
      { role: 'QMS_VIEWER' } as never,
    ]);

    const roles = await permissionService.getEffectiveRoles('user-1', 'qms');
    expect(roles).toEqual(['QMS_ADMIN', 'QMS_VIEWER']);
  });

  it('computes a stable roleVersion hash', async () => {
    vi.mocked(roleGrantRepository.findActiveByUserAndApp).mockResolvedValue([
      { role: 'ADMIN' } as never,
      { role: 'VIEWER' } as never,
    ]);

    const claims1 = await permissionService.getTokenClaims('user-1', 'qms');
    const claims2 = await permissionService.getTokenClaims('user-1', 'qms');

    expect(claims1.roleVersion).toBe(claims2.roleVersion);
    expect(claims1.roleVersion).toHaveLength(12);
    expect(claims1.appRoles).toEqual(['ADMIN', 'VIEWER']);
  });
});
