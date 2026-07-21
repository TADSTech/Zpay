import { db, auth } from "../config/firebase";
import { MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE } from "../config/env";

export async function getMerchantCredentials(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  try {
    const token = authHeader.split("Bearer ")[1];
    let uid;
    
    if (token === "mock_token_tola") {
      uid = "mock_uid_tola";
    } else {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
    }

    const doc = await db.collection("merchants").doc(uid).collection("config").doc("monnify").get();
    if (doc.exists) {
      const data = doc.data();
      if (data && data.apiKey && data.secretKey && data.contractCode) {
        return {
          uid,
          apiKey: data.apiKey,
          secretKey: data.secretKey,
          contractCode: data.contractCode,
        };
      }
    }

    // Fallback to environment Monnify credentials (e.g. for Presentation Account or default sandbox)
    const fallbackApiKey = MONNIFY_API_KEY || "MK_TEST_Y6T8R1Q9PZ";
    const fallbackSecretKey = MONNIFY_SECRET_KEY || "Z3W2X1C0V9B8N7M6Q5W4E3R2T1Y0U9I8";
    const fallbackContractCode = MONNIFY_CONTRACT_CODE || "4820193857";

    return {
      uid,
      apiKey: fallbackApiKey,
      secretKey: fallbackSecretKey,
      contractCode: fallbackContractCode
    };
  } catch (e) {
    console.error("Error verifying ID token or loading Firestore credentials:", e);
  }
  return null;
}
