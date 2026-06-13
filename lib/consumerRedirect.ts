import { ValidationError } from '@/errors/customErrors';

export function normalizeRedirectUri(redirectUri: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new ValidationError('Invalid redirectUri');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('redirectUri must use http or https');
  }

  return parsed;
}

export function buildConsumerRedirectUrl(
  redirectUri: string,
  accessToken: string,
  state?: string
): string {
  const url = normalizeRedirectUri(redirectUri);
  url.searchParams.set('token', accessToken);

  if (state) {
    url.searchParams.set('state', state);
  }

  return url.toString();
}
