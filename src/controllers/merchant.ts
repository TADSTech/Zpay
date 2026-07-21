import { db, auth } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function handleInitMerchant(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    
    // Skip provisioning for mock account
    if (token === "mock_token_tola") {
      return Response.json({ success: true, isNew: false, profile: { uid: "mock_uid_tola", storeName: "Tola's Thrift & Soles" } });
    }

    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const merchantRef = db.collection("merchants").doc(uid);
    const merchantDoc = await merchantRef.get();

    if (merchantDoc.exists) {
      return Response.json({ success: true, isNew: false, profile: merchantDoc.data() });
    }

    // Create a blank merchant profile for fresh accounts — NO mock data
    const profile = {
      uid,
      email: decoded.email || "",
      displayName: decoded.name || "",
      storeName: "",
      createdAt: FieldValue.serverTimestamp(),
    };

    await merchantRef.set(profile);
    console.log(`[init-merchant] New merchant provisioned: uid=${uid}, email=${decoded.email}`);

    return Response.json({ success: true, isNew: true, profile });
  } catch (err: any) {
    console.error("[init-merchant] Error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
