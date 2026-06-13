import NextAuth from 'next-auth';
import type { MicrosoftEntraIDProfile } from 'next-auth/providers/microsoft-entra-id';
import { authConfig } from '@/lib/auth.config';
import { entraAuthService } from '@/services/entraAuthService';
import { fetchGraphMe } from '@/lib/graphClient';
import { logger } from '@/lib/logger';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ profile, account }) {
      if (account?.provider !== 'microsoft-entra-id') return true;
      if (!profile) return false;

      const entraProfile = profile as unknown as MicrosoftEntraIDProfile & { employeeId?: string };

      // Fetch Graph profile once — resolves employeeId, department, and HR fields
      const graphProfile = account.access_token
        ? await fetchGraphMe(account.access_token)
        : null;

      const employeeId =
        graphProfile?.onPremisesSamAccountName ??
        graphProfile?.employeeId ??
        entraProfile.employeeId ??
        entraProfile.preferred_username?.split('@')[0];

      try {
        await entraAuthService.handleEntraSignIn(
          {
            sub:               entraProfile.sub,
            email:             graphProfile?.mail ?? entraProfile.email,
            name:              graphProfile?.displayName ?? entraProfile.name,
            preferred_username: entraProfile.preferred_username,
            employeeId,
            department:        graphProfile?.department,
            jobTitle:          graphProfile?.jobTitle,
            officeLocation:    graphProfile?.officeLocation,
            mobilePhone:       graphProfile?.mobilePhone,
          },
          'entra-callback',
          'entra-callback'
        );
        return true;
      } catch (err) {
        logger.error('Entra signIn callback failed', { error: String(err) });
        return false;
      }
    },

    async jwt({ token, profile, account }) {
      if (account?.provider === 'microsoft-entra-id' && profile) {
        const entraProfile = profile as unknown as MicrosoftEntraIDProfile & { employeeId?: string };
        token.entraObjectId = entraProfile.sub;
        token.preferred_username = entraProfile.preferred_username;

        const graphProfile = account.access_token
          ? await fetchGraphMe(account.access_token)
          : null;

        token.employeeId =
          graphProfile?.onPremisesSamAccountName ??
          graphProfile?.employeeId ??
          entraProfile.employeeId ??
          entraProfile.preferred_username?.split('@')[0];

        token.department = graphProfile?.department;
      }
      return token;
    },

    async session({ session, token }) {
      const s = session as typeof session & {
        entraObjectId?: string;
        employeeId?: string;
        department?: string;
      };
      if (token.entraObjectId) s.entraObjectId = token.entraObjectId as string;
      if (token.employeeId)    s.employeeId    = token.employeeId    as string;
      if (token.department)    s.department    = token.department    as string;
      return s;
    },
  },
});
