import { directorySyncService } from '@/services/directorySyncService';
import { userRepository } from '@/repositories/userRepository';
import { NotFoundError } from '@/errors/customErrors';

export interface SelfProfileUpdateInput {
  displayName?: string;
  department?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
}

export class SelfProfileService {
  async updateOwnProfile(userId: string, input: SelfProfileUpdateInput) {
    const user = await userRepository.findWithProfile(userId);
    if (!user) throw new NotFoundError('User not found');

    await directorySyncService.updateUserProfileAndSync(userId, userId, {
      displayName: input.displayName?.trim() || user.displayName || user.employeeId,
      department: input.department?.trim() || user.profile?.department || '',
      jobTitle: input.jobTitle?.trim() || user.profile?.jobTitle || '',
      officeLocation: input.officeLocation?.trim() || user.profile?.officeLocation || '',
      mobilePhone: input.mobilePhone?.trim() || user.profile?.mobilePhone || '',
      syncToGraph: false,
    });
  }
}

export const selfProfileService = new SelfProfileService();
