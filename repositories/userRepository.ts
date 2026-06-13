import type { Prisma, User } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('user');
  }

  async findByEmployeeId(employeeId: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return this.getClient(tx).user.findUnique({ where: { employeeId } });
  }

  async findActiveByEmployeeId(employeeId: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return this.getClient(tx).user.findFirst({
      where: { employeeId, employmentStatus: 'ACTIVE' },
    });
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return this.getClient(tx).user.findUnique({ where: { email } });
  }

  async create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient): Promise<User> {
    return this.getClient(tx).user.create({ data });
  }

  async updateById(id: string, data: Prisma.UserUpdateInput, tx?: Prisma.TransactionClient): Promise<User> {
    return this.getClient(tx).user.update({ where: { id }, data });
  }

  async updateM365Status(
    id: string,
    m365Linked: boolean,
    canSendDelegatedMail: boolean,
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    return this.getClient(tx).user.update({
      where: { id },
      data: { m365Linked, canSendDelegatedMail },
    });
  }

  async findWithProfile(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async findAllActiveWithProfile(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.findMany({
      where: { employmentStatus: 'ACTIVE' },
      include: {
        profile: {
          select: { department: true, jobTitle: true, officeLocation: true, mobilePhone: true },
        },
      },
      orderBy: { employeeId: 'asc' },
    });
  }

  async findAllActiveBasic(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.findMany({
      where: { employmentStatus: 'ACTIVE' },
      select: {
        id:          true,
        employeeId:  true,
        displayName: true,
        email:       true,
        m365Linked:  true,
      },
      orderBy: { displayName: 'asc' },
    });
  }

  async findAllActiveWithRolesAndProfile(appId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.findMany({
      where: { employmentStatus: 'ACTIVE' },
      include: {
        roleGrants: {
          where: { isActive: true, app: { appId } },
          select: { role: true },
        },
        profile: {
          select: { department: true, jobTitle: true },
        },
      },
      orderBy: { employeeId: 'asc' },
    });
  }
}

export const userRepository = new UserRepository();
