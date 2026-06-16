import type { AppRegistration, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class AppRegistrationRepository extends BaseRepository<AppRegistration> {
  constructor() {
    super('appRegistration');
  }

  async findByAppId(appId: string, tx?: Prisma.TransactionClient): Promise<AppRegistration | null> {
    return this.getClient(tx).appRegistration.findUnique({ where: { appId } });
  }

  async findAllActive(tx?: Prisma.TransactionClient): Promise<AppRegistration[]> {
    return this.getClient(tx).appRegistration.findMany({ where: { isActive: true } });
  }

  async create(data: Prisma.AppRegistrationCreateInput, tx?: Prisma.TransactionClient): Promise<AppRegistration> {
    return this.getClient(tx).appRegistration.create({ data });
  }

  async updateById(id: string, data: Prisma.AppRegistrationUpdateInput, tx?: Prisma.TransactionClient): Promise<AppRegistration> {
    return this.getClient(tx).appRegistration.update({ where: { id }, data });
  }

  async updateAvailableRoles(appId: string, roles: string[], tx?: Prisma.TransactionClient): Promise<AppRegistration> {
    return this.getClient(tx).appRegistration.update({ where: { appId }, data: { availableRoles: roles } });
  }
}

export const appRegistrationRepository = new AppRegistrationRepository();
