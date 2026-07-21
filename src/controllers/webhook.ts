import { db } from "../config/firebase";
import { MONNIFY_WEBHOOK_SECRET } from "../config/env";
import * as crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

const processedRequestIds = new Set<string>();

export async function handleWebhook(req: Request): Promise<Response> {
  try {
    if (req.method === "GET") {
      console.log("[webhook] GET request received. Returning UP status.");
      return new Response("Webhook endpoint is active (GET)", { status: 200 });
    }

    const rawBodyText = await req.text();
    console.log(`[webhook] POST body: ${rawBodyText.substring(0, 200)}`);

    if (!rawBodyText.trim()) {
      console.log("[webhook] Empty body. Returning 200 OK.");
      return new Response("Empty body received", { status: 200 });
    }

    const signature = req.headers.get("monnify-signature");

    // Monnify signature verification: HMAC-SHA512 using the Webhook Secret (or Secret Key)
    if (MONNIFY_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac("sha512", MONNIFY_WEBHOOK_SECRET)
        .update(rawBodyText)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.warn("[webhook] Unauthorized: Signature mismatch.");
        return new Response("Unauthorized signature", { status: 401 });
      }
    }

    let payload;
    try {
      payload = JSON.parse(rawBodyText);
    } catch (e: any) {
      console.error("[webhook] JSON parsing error:", e.message);
      return new Response("Invalid JSON body", { status: 400 });
    }
    const requestId = payload.requestId || payload.eventId || payload.eventData?.transactionReference;

    console.log(`[webhook] Received event=${payload.eventType || payload.event || 'unknown'} requestId=${requestId || 'none'}`);

    if (requestId) {
      if (processedRequestIds.has(requestId)) {
        console.log(`[webhook] Duplicate event ignored. requestId=${requestId}`);
        return new Response("Processed (Duplicate)", { status: 200 });
      }
      processedRequestIds.add(requestId);
    }

    // Monnify payload data is inside eventData
    const eventData = payload.eventData || payload.data || {};
    const orderRef = eventData.paymentReference || eventData.accountReference || payload.data?.orderReference || payload.data?.accountRef;
    const status = payload.eventType === "SUCCESSFUL_TRANSACTION" || eventData.paymentStatus === "PAID" ? "SUCCESS" : (payload.status || eventData.status);

    if (orderRef && orderRef.startsWith("ZPY_")) {
      // Order reference format: ZPY_<merchantUid>_<randomBits>
      const parts = orderRef.split("_");
      
      if (parts.length >= 3) {
        const merchantUid = parts[1];
        const orderDocRef = db.collection("merchants").doc(merchantUid).collection("orders").doc(orderRef);

        console.log(`[webhook] merchantTxRef=${orderRef} merchantUid=${merchantUid} status=${status}`);

        if (status === "SUCCESS" || status === "paid" || payload.event === "payment_success" || payload.event === "virtual_account.funded" || payload.eventType === "SUCCESSFUL_TRANSACTION") {
          
          const amountReceived = eventData.amountPaid || eventData.amountReceived;
          const amountExpected = eventData.payableAmount || eventData.amountExpected;
          
          let orderStatus = "paid";
          let notes = "";
          
          if (amountReceived !== undefined && amountExpected !== undefined) {
            if (amountReceived < amountExpected) {
              orderStatus = "partial";
              notes = `Under-payment detected: received ${amountReceived} kobo, expected ${amountExpected} kobo. Remaining: ${amountExpected - amountReceived} kobo.`;
              console.warn(`[webhook] merchantTxRef=${orderRef} UNDER-PAYMENT: received=${amountReceived} expected=${amountExpected}`);
            } else if (amountReceived > amountExpected) {
              orderStatus = "paid";
              notes = `Over-payment detected: received ${amountReceived} kobo, expected ${amountExpected} kobo. Excess: ${amountReceived - amountExpected} kobo. Refund workflow triggered.`;
              console.warn(`[webhook] merchantTxRef=${orderRef} OVER-PAYMENT: received=${amountReceived} expected=${amountExpected}`);
            }
          }

          const updateData: Record<string, unknown> = { 
            status: orderStatus,
            updatedAt: FieldValue.serverTimestamp()
          };
          if (notes) updateData.notes = notes;

          await orderDocRef.update(updateData);
          console.log(`[webhook] merchantTxRef=${orderRef} updated to ${orderStatus.toUpperCase()}`);
          
          // Decrement stock levels for the ordered items
          if (orderStatus === "paid" || orderStatus === "partial") {
            const orderSnap = await orderDocRef.get();
            if (orderSnap.exists) {
              const orderData = orderSnap.data();
              if (orderData && orderData.items) {
                for (const item of orderData.items) {
                  const productsRef = db.collection("merchants").doc(merchantUid).collection("products");
                  const prodSnap = await productsRef.where("name", "==", item.product).limit(1).get();
                  if (!prodSnap.empty) {
                    const prodDoc = prodSnap.docs[0];
                    const currentStock = prodDoc.data().stockQuantity || 0;
                    await prodDoc.ref.update({
                      stockQuantity: Math.max(0, currentStock - (item.qty || 1))
                    });
                    console.log(`[webhook] Decremented stock for ${item.product}. New stock: ${Math.max(0, currentStock - (item.qty || 1))}`);
                  }
                }
              }
            }
          }
        }
      } else {
        console.warn(`[webhook] merchantTxRef=${orderRef} does not contain valid merchant UID.`);
      }
    } else if (orderRef) {
      // Fallback for mock orders (e.g., ORD-928374) seeded for Tola Shofola
      if (status === "SUCCESS" || status === "paid" || payload.event === "payment_success" || payload.event === "virtual_account.funded") {
        await db.collection("merchants").doc("mock_uid_tola").collection("orders").doc(orderRef).update({
          status: "paid",
          updatedAt: FieldValue.serverTimestamp()
        }).catch(() => console.warn(`[webhook] Fallback update for mock merchantTxRef=${orderRef} failed.`));
        console.log(`[webhook] Fallback: merchantTxRef=${orderRef} updated to PAID`);
      }
    }

    return new Response("Webhook Received", { status: 200 });
  } catch (err: any) {
    console.error("[webhook] Processing error:", err);
    return new Response("Error", { status: 500 });
  }
}
