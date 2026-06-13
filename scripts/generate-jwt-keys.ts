import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose';
import { randomUUID } from 'node:crypto';

async function main() {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  const privatePem = await exportPKCS8(privateKey);
  const publicPem = await exportSPKI(publicKey);
  const keyId = randomUUID();

  console.log('');
  console.log('AUTH_PRIVATE_KEY="' + privatePem.replace(/\n/g, '\\n') + '"');
  console.log('AUTH_PUBLIC_KEY="' + publicPem.replace(/\n/g, '\\n') + '"');
  console.log('AUTH_KEY_ID="' + keyId + '"');
  console.log('');
}

main().catch((error) => {
  console.error('Failed to generate JWT signing keys:', error);
  process.exit(1);
});
