export function getPublicBaseUrl(): string {
  const baseUrl =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    'http://localhost:3001';

  return baseUrl.replace(/\/+$/, '');
}

export function resolvePublicUrl(pathOrUrl: string): URL {
  return new URL(pathOrUrl, `${getPublicBaseUrl()}/`);
}
