import { db } from "../config/firebase";
import { getMerchantCredentials } from "../services/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function handleProductsApi(req: Request, method: string, url: URL): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    const customCreds = await getMerchantCredentials(authHeader);

    if (!customCreds || !customCreds.uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const uid = customCreds.uid;
    const productsRef = db.collection("merchants").doc(uid).collection("products");

    if (method === "GET") {
      const snapshot = await productsRef.orderBy("createdAt", "desc").get();
      const products = snapshot.docs.map(doc => doc.data());
      
      // Get settings (for notAvailableMessage)
      const settingsDoc = await db.collection("merchants").doc(uid).collection("config").doc("settings").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      return Response.json({ success: true, products, settings });
    } 
    
    if (method === "POST") {
      const body = await req.json();
      
      // Update settings
      if (body.action === "updateSettings") {
        await db.collection("merchants").doc(uid).collection("config").doc("settings").set({
          notAvailableMessage: body.notAvailableMessage
        }, { merge: true });
        return Response.json({ success: true });
      }
      
      // Add Product
      const { name, price, variants, stockQuantity } = body;
      if (!name || typeof price !== "number") {
        return Response.json({ success: false, error: "Name and price are required." }, { status: 400 });
      }

      const id = "p_" + Math.random().toString(36).substring(2, 11);
      const newProduct = {
        id,
        name,
        price,
        stockQuantity: typeof stockQuantity === "number" ? stockQuantity : 10,
        variants: Array.isArray(variants) ? variants : [],
        createdAt: Date.now()
      };

      await productsRef.doc(id).set(newProduct);
      return Response.json({ success: true, product: newProduct });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        return Response.json({ success: false, error: "Product ID required." }, { status: 400 });
      }

      await productsRef.doc(id).delete();
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  } catch (e: any) {
    console.error("[products-api] Error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
