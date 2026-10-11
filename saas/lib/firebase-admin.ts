// saas/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getPrivateKey(): string {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!key) throw new Error('FIREBASE_ADMIN_PRIVATE_KEY not set');
  
  // Vercel salva com \n literais - converte para quebras reais
  return key.replace(/\\n/g, '\n');
}

function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: getPrivateKey(),
      }),
    });
  }
}

export function getFirebaseAdmin() {
  initializeFirebaseAdmin();
  return {
    db: getFirestore(),
    auth: getAuth(),
  };
}

// Helper para verificar token de autenticação (opcional)
export async function verifyAuthToken(token: string) {
  const { auth } = getFirebaseAdmin();
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    return null;
  }
}