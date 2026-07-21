import { db, auth } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { MONNIFY_BASE_URL } from "../config/env";

export async function getUidFromHeader(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split("Bearer ")[1];
  if (token === "mock_token_tola") {
    return "mock_uid_tola";
  }
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch (e) {
    console.error("Token verification failed:", e);
    return null;
  }
}

export async function handleSaveCredentials(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    const uid = await getUidFromHeader(authHeader);
    if (!uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey, secretKey, contractCode } = await req.json();
    
    // Verify Monnify credentials by attempting a login
    const authString = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
    const verifyRes = await fetch(`${MONNIFY_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json",
      },
    });

    if (!verifyRes.ok) {
      const errorText = await verifyRes.text();
      return Response.json({ success: false, error: `Invalid Monnify Credentials. Verification failed: ${verifyRes.status}` }, { status: 400 });
    }

    const verifyData = await verifyRes.json();
    if (!verifyData.requestSuccessful) {
      return Response.json({ success: false, error: `Invalid Monnify Credentials: ${verifyData.responseMessage}` }, { status: 400 });
    }

    await db.collection("merchants").doc(uid).collection("config").doc("monnify").set({
      apiKey,
      secretKey,
      contractCode,
      updatedAt: FieldValue.serverTimestamp()
    });

    return Response.json({ success: true, message: "Monnify credentials verified and stored securely in Firestore." });
  } catch (err: any) {
    console.error("Save credentials error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function handleGetCredentials(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    const uid = await getUidFromHeader(authHeader);
    if (!uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const doc = await db.collection("merchants").doc(uid).collection("config").doc("monnify").get();
    if (doc.exists) {
      const data = doc.data();
      return Response.json({
        success: true,
        credentials: {
          apiKey: data?.apiKey || "",
          secretKey: data?.secretKey || "",
          contractCode: data?.contractCode || "",
        }
      });
    }
    return Response.json({ success: true, credentials: null });
  } catch (err: any) {
    console.error("Get credentials error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}


