import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let initAttempted = false;

const loadServiceAccount = () => {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      return JSON.parse(jsonEnv);
    } catch (err) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
    }
  }

  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (pathEnv) {
    try {
      const raw = fs.readFileSync(pathEnv, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT_PATH:', err.message);
    }
  }

  // Fallback to repo root service account if present (dev convenience)
  const fallbackPath = path.resolve(process.cwd(), '..', 'orderbyqr-639ea-31bed3eebf8b.json');
  if (fs.existsSync(fallbackPath)) {
    try {
      const raw = fs.readFileSync(fallbackPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Invalid fallback firebase service account json:', err.message);
    }
  }

  return null;
};

export const getFirebaseAdmin = () => {
  if (admin.apps.length) return admin;
  if (initAttempted) return null;
  initAttempted = true;

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn('Firebase admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.');
    return null;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  } catch (err) {
    console.error('Failed to initialize Firebase admin:', err.message);
    return null;
  }
};

