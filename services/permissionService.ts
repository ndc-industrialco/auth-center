import { createHash } from 'crypto';
import { roleGrantRepository } from '@/repositories/roleGrantRepository';

export class PermissionService {
  async getEffectiveRoles(userId: string, appId: string): Promise<string[]> {
    const grants = await roleGrantRepository.findActiveByUserAndApp(userId, appId);
    return grants.map((g) => g.role);
  }

  async getTokenClaims(
    userId: string,
    appId: string
  ): Promise<{ appRoles: string[]; roleVersion: string }> {
    const roles = await this.getEffectiveRoles(userId, appId);
    const sorted = [...roles.map((r) => `role:${r}`)].sort();
    const roleVersion = createHash('sha256').update(sorted.join('|')).digest('hex').slice(0, 12);

    return { appRoles: roles, roleVersion };
  }
}

export const permissionService = new PermissionService();
