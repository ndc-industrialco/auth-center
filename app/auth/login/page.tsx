import { LoginPageClient } from './LoginPageClient';
import { getPublicBaseUrl } from '@/lib/publicUrl';

interface Props {
  searchParams: Promise<{
    callbackUrl?: string;
    appId?: string;
    redirectUri?: string;
    state?: string;
  }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? '/admin';
  const appId = params.appId ?? 'auth-center';
  const redirectUri = params.redirectUri;
  const state = params.state;
  const publicBaseUrl = getPublicBaseUrl();

  return (
    <LoginPageClient
      callbackUrl={callbackUrl}
      appId={appId}
      redirectUri={redirectUri}
      state={state}
      publicBaseUrl={publicBaseUrl}
    />
  );
}
