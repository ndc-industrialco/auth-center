import type {
  DirectorySyncDirection,
  DirectorySyncEntityType,
  DirectorySyncStatus,
  Prisma,
} from '@/app/generated/prisma/client';
import { directorySyncLogRepository } from '@/repositories/directorySyncLogRepository';

interface RecordDirectorySyncLogInput {
  entityType: DirectorySyncEntityType;
  entityId?: string;
  direction: DirectorySyncDirection;
  status: DirectorySyncStatus;
  requestedBy: string;
  summary?: Prisma.InputJsonValue;
  errorMessage?: string;
}

export class DirectorySyncLogService {
  async record(input: RecordDirectorySyncLogInput) {
    return directorySyncLogRepository.create({
      entityType: input.entityType,
      entityId: input.entityId,
      direction: input.direction,
      status: input.status,
      requestedBy: input.requestedBy,
      requestedAt: new Date(),
      completedAt: new Date(),
      summaryJson: input.summary,
      errorMessage: input.errorMessage,
    });
  }
}

export const directorySyncLogService = new DirectorySyncLogService();
