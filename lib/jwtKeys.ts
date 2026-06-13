import {
  exportJWK,
  importPKCS8,
  importSPKI,
  type JWK,
} from 'jose';

const ASYMMETRIC_ALG = 'RS256';
const SYMMETRIC_ALG = 'HS256';

type JwtMode = 'asymmetric' | 'symmetric';

let signingKeyPromise: Promise<CryptoKey | Uint8Array> | null = null;
let verificationKeyPromise: Promise<CryptoKey | Uint8Array> | null = null;
let publicJwkPromise: Promise<JWK | null> | null = null;

function getMode(): JwtMode {
  const hasPrivate = Boolean(process.env.AUTH_PRIVATE_KEY);
  const hasPublic = Boolean(process.env.AUTH_PUBLIC_KEY);

  if (hasPrivate || hasPublic) {
    if (!hasPrivate || !hasPublic) {
      throw new Error('AUTH_PRIVATE_KEY and AUTH_PUBLIC_KEY must both be configured');
    }
    return 'asymmetric';
  }

  if (!process.env.AUTH_SECRET) {
    throw new Error('JWT signing configuration is missing');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production requires AUTH_PRIVATE_KEY and AUTH_PUBLIC_KEY');
  }

  return 'symmetric';
}

export function getJwtAlgorithm(): 'RS256' | 'HS256' {
  return getMode() === 'asymmetric' ? ASYMMETRIC_ALG : SYMMETRIC_ALG;
}

export function getJwtKeyId(): string | undefined {
  return process.env.AUTH_KEY_ID || undefined;
}

export async function getSigningKey(): Promise<CryptoKey | Uint8Array> {
  if (!signingKeyPromise) {
    signingKeyPromise = (async () => {
      if (getMode() === 'asymmetric') {
        return importPKCS8(process.env.AUTH_PRIVATE_KEY!, ASYMMETRIC_ALG);
      }

      return new TextEncoder().encode(process.env.AUTH_SECRET!);
    })();
  }

  return signingKeyPromise;
}

export async function getVerificationKey(): Promise<CryptoKey | Uint8Array> {
  if (!verificationKeyPromise) {
    verificationKeyPromise = (async () => {
      if (getMode() === 'asymmetric') {
        return importSPKI(process.env.AUTH_PUBLIC_KEY!, ASYMMETRIC_ALG);
      }

      return new TextEncoder().encode(process.env.AUTH_SECRET!);
    })();
  }

  return verificationKeyPromise;
}

export async function getPublicJwk(): Promise<JWK | null> {
  if (!publicJwkPromise) {
    publicJwkPromise = (async () => {
      if (getMode() !== 'asymmetric') return null;

      const publicKey = await getVerificationKey();
      const jwk = await exportJWK(publicKey);
      const kid = getJwtKeyId();

      return {
        ...jwk,
        alg: ASYMMETRIC_ALG,
        use: 'sig',
        ...(kid ? { kid } : {}),
      };
    })();
  }

  return publicJwkPromise;
}
