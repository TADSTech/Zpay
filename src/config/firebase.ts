import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import * as fs from "fs";

let serviceAccount: any;

const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (envJson) {
  try {
    serviceAccount = JSON.parse(envJson);
    console.log("Firebase config loaded from FIREBASE_SERVICE_ACCOUNT_JSON env var.");
  } catch (e) {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON:", e);
  }
}

if (!serviceAccount) {
  try {
    const raw = fs.readFileSync("./firebase-service-account.json", "utf8");
    serviceAccount = JSON.parse(raw);
    console.log("Firebase config loaded from firebase-service-account.json.");
  } catch {
    console.warn("No Firebase service account found. Firebase features will be unavailable on first use.");
  }
}

let fbApp: any;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

try {
  if (serviceAccount) {
    fbApp = initializeApp({ credential: cert(serviceAccount) });
  } else {
    fbApp = initializeApp({ credential: applicationDefault() });
  }
  _db = getFirestore();
  _auth = getAuth();
  console.log("Firebase Admin SDK successfully initialized.");
} catch (e) {
  console.error("Firebase Admin SDK failed to initialize:", e);
}

function ensureFirebase() {
  if (!_db || !_auth) {
    throw new Error(
      "Firebase not initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON env var or provide firebase-service-account.json."
    );
  }
  return { db: _db, auth: _auth };
}

export function getDb(): Firestore {
  return ensureFirebase().db;
}

export function getAuthInstance(): Auth {
  return ensureFirebase().auth;
}

// Convenience re-exports for callers that destructure at module level
// (each call validates Firebase is ready)
export const db = new Proxy({} as Firestore, {
  get(_target, prop: string | symbol) {
    const f = ensureFirebase().db;
    const value = (f as any)[prop];
    return typeof value === "function" ? value.bind(f) : value;
  },
});

export const auth = new Proxy({} as Auth, {
  get(_target, prop: string | symbol) {
    const f = ensureFirebase().auth;
    const value = (f as any)[prop];
    return typeof value === "function" ? value.bind(f) : value;
  },
});
