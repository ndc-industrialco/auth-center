import type {
  DirectorySyncDirection,
  DirectorySyncEntityType,
  DirectorySyncLog,
  DirectorySyncStatus,
  Prisma,
} from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export interface CreateDirectorySyncLogInput {
  entityType: DirectorySyncEntityType;
  entityId?: string;
  direction: DirectorySyncDirection;
  status: DirectorySyncStatus;
  requestedBy: string;
  requestedAt?: Date;
  completedAt?: Date;
  summaryJson?: Prisma.InputJsonValue;
  errorMessage?: string;
}

export class DirectorySyncLogRepository extends BaseRepository<DirectorySyncLog> {
  constructor() {
    super('directorySyncLog');
  }

  async create(
    input: CreateDirectorySyncLogInput,
    tx?: Prisma.TransactionClient
  ): Promise<DirectorySyncLog> {
    return this.getClient(tx).directorySyncLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        direction: input.direction,
        status: input.status,
        requestedBy: input.requestedBy,
        requestedAt: input.requestedAt ?? new Date(),
        completedAt: input.completedAt,
        summaryJson: input.summaryJson,
        errorMessage: input.errorMessage,
      },
    });
  }
}

export const directorySyncLogRepository = new DirectorySyncLogRepository();
