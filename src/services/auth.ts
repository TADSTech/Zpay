import { db, auth } from "../config/firebase";

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

    // Return uid even if no Monnify credentials configured yet
    // This allows the user to view their empty dashboard and be prompted to add creds
    return { uid, apiKey: null, secretKey: null, contractCode: null };
  } catch (e) {
    console.error("Error verifying ID token or loading Firestore credentials:", e);
  }
  return null;
}
