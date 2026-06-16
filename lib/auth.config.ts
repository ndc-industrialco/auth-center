import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import type { NextAuthConfig } from 'next-auth';

// Edge-safe configuration — no DB imports allowed here.
const isProduction = process.env.NODE_ENV === 'production';

export const authConfig: NextAuthConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: 'openid profile email offline_access https://graph.microsoft.com/User.Read',
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  // Unique cookie name prevents collision with other Next.js apps on the same domain.
  // All Auth.js apps default to "authjs.session-token" — on localhost they share
  // the same cookie jar (cookies scope by domain, not port), so one app's login
  // overwrites another's session and causes JWTSessionError: no matching decryption secret.
  cookies: {
    sessionToken: {
      name: isProduction ? '__Secure-auth-center.session-token' : 'auth-center.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: isProduction,
      },
    },
  },
};
