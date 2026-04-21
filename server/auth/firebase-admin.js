import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let _auth = null;

export function getFirebaseAuth() {
  if (_auth) return _auth;
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON missing');
    const json = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    initializeApp({
      credential: cert(JSON.parse(json)),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  _auth = getAuth();
  return _auth;
}
