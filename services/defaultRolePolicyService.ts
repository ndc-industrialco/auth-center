import type { DefaultRolePolicy, DefaultRolePolicyApplyTo } from '@/app/generated/prisma/client';
import type { AuthMethod } from '@/types/auth';
import { defaultRolePolicyRepository } from '@/repositories/defaultRolePolicyRepository';
import { appRegistrationRepository } from '@/repositories/appRegistrationRepository';
import { roleGrantRepository } from '@/repositories/roleGrantRepository';
import { adminAuditRepository } from '@/repositories/adminAuditRepository';
import { NotFoundError, ConflictError } from '@/errors/customErrors';
import { logger } from '@/lib/logger';

export interface CreateDefaultRolePolicyInput {
  appId:        string;
  role:         string;
  applyTo:      DefaultRolePolicyApplyTo;
  departmentId?: string;
  description?:  string;
}

export class DefaultRolePolicyService {
  /**
   * Apply all matching default role policies to a newly provisioned user.
   * Matches on authMethod AND department (null policy = all departments).
   * Fail-safe: errors logged but do not interrupt the sign-in flow.
   */
  async applyDefaultGrants(
    userId: string,
    authMethod: AuthMethod,
    departmentId?: string | null
  ): Promise<void> {
    try {
      const policies = await defaultRolePolicyRepository.findActiveFor(authMethod, departmentId);
      if (policies.length === 0) return;

      type PolicyWithApp = DefaultRolePolicy & { app: { id: string; appId: string } };

      // Batch-load grants for all unique apps to avoid N+1 queries
      const uniqueAppIds = [...new Set(policies.map((p) => (p as PolicyWithApp).app.id))];
      const grantArrays = await Promise.all(
        uniqueAppIds.map((appId) => roleGrantRepository.findActiveByUserAndApp(userId, appId))
      );
      const grantsByAppId = new Map(uniqueAppIds.map((appId, i) => [appId, grantArrays[i]]));

      for (const policy of policies) {
        const appRecord = (policy as PolicyWithApp).app;
        const appId = appRecord.id;
        const existing = grantsByAppId.get(appId) ?? [];
        const alreadyHasRole = existing.some((g) => g.role === policy.role);

        if (!alreadyHasRole) {
          await roleGrantRepository.grant({
            user:      { connect: { id: userId } },
            app:       { connect: { id: appId } },
            role:      policy.role,
            grantedBy: `DEFAULT_POLICY:${policy.id}`,
          });
          logger.info('Default role grant applied', {
            userId,
            appId: appRecord.appId,
            role:  policy.role,
            policyId: policy.id,
            departmentId,
          });
        }
      }
    } catch (err) {
      logger.error('Failed to apply default role grants', { userId, authMethod, departmentId, error: String(err) });
    }
  }

  async listPolicies() {
    return defaultRolePolicyRepository.findAll();
  }

  async createPolicy(input: CreateDefaultRolePolicyInput, actorId: string): Promise<DefaultRolePolicy> {
    const app = await appRegistrationRepository.findByAppId(input.appId);
    if (!app) throw new NotFoundError(`App '${input.appId}' not found`);

    const existing = await defaultRolePolicyRepository.findAll();
    const duplicate = existing.find(
      (p) =>
        p.appId === app.id &&
        p.role === input.role &&
        p.applyTo === input.applyTo &&
        (p.departmentId ?? null) === (input.departmentId ?? null) &&
        p.isActive
    );
    if (duplicate) {
      throw new ConflictError(
        `An active default policy already exists for role '${input.role}' in '${input.appId}'` +
        (input.departmentId ? ` (dept: ${input.departmentId})` : ' (all departments)')
      );
    }

    const policy = await defaultRolePolicyRepository.create({
      app:          { connect: { id: app.id } },
      role:         input.role,
      applyTo:      input.applyTo,
      departmentId: input.departmentId ?? null,
      description:  input.description,
      createdBy:    actorId,
    });

    await adminAuditRepository.record({
      actorId,
      action:       'DEFAULT_GRANT_POLICY_CREATED',
      resourceType: 'DefaultRolePolicy',
      resourceId:   policy.id,
      targetAppId:  input.appId,
      detail:       { role: input.role, applyTo: input.applyTo, departmentId: input.departmentId },
    });

    return policy;
  }

  async deactivatePolicy(id: string, actorId: string): Promise<DefaultRolePolicy> {
    const policy = await defaultRolePolicyRepository.findById(id);
    if (!policy) throw new NotFoundError('Policy not found');

    const updated = await defaultRolePolicyRepository.deactivate(id);

    await adminAuditRepository.record({
      actorId,
      action:       'DEFAULT_GRANT_POLICY_DEACTIVATED',
      resourceType: 'DefaultRolePolicy',
      resourceId:   id,
    });

    return updated;
  }
}

export const defaultRolePolicyService = new DefaultRolePolicyService();
