export const PORT = process.env.PORT || 3000;
export const MONNIFY_BASE_URL = process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com";
export const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY;
export const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY;
export const MONNIFY_CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE;
export const MONNIFY_WEBHOOK_SECRET = process.env.MONNIFY_WEBHOOK_SECRET;
export const MONNIFY_CALLBACK_URL = process.env.MONNIFY_CALLBACK_URL;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const GROQ_API_KEY = process.env.GROQ_API_KEY;

export const FIREBASE_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || ""
};
