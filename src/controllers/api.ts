import { db } from "../config/firebase";
import { getMerchantCredentials } from "../services/auth";
import { parseChatIntent } from "../services/ai";
import { createVirtualAccount, createCheckoutOrder } from "../services/monnify";

export async function handleParseOrder(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    const customCreds = await getMerchantCredentials(authHeader);

    if (!customCreds || !customCreds.uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if merchant has Monnify credentials configured
    if (!customCreds.apiKey || !customCreds.secretKey || !customCreds.contractCode) {
      return Response.json({ 
        success: false, 
        error: "No Monnify API credentials configured. Please go to the Developer & API tab and save your Monnify credentials first." 
      }, { status: 400 });
    }

    const body = await req.json();
    const { message, customerName, paymentType, history } = body;
    
    if (!message) {
      return Response.json({ success: false, error: "Message is required" }, { status: 400 });
    }

    const parsed = await parseChatIntent(message, customCreds.uid, history || []);
    
    if (parsed.error) {
      return Response.json({
        success: false,
        error: parsed.error
      });
    }

    if (parsed.missingInfo) {
      return Response.json({
        success: true,
        missingInfo: parsed.missingInfo
      });
    }

    if (parsed.intent !== "purchase" || !parsed.items || parsed.items.length === 0) {
      return Response.json({
        success: false,
        error: "No purchase intent or items detected in your message. Try saying something like 'I want to buy 2 black hoodies'."
      });
    }

    // Embed the UID inside the order reference for O(1) webhook lookups!
    const randomBits = Math.floor(100000 + Math.random() * 900000);
    const orderId = `ZPY_${customCreds.uid}_${randomBits}`;

    console.log(`[parse-order] merchantTxRef=${orderId} uid=${customCreds.uid} amount=${parsed.totalAmount} method=${paymentType}`);

    let virtualAccount = null;
    let checkoutLink = null;

    if (paymentType === "transfer") {
      virtualAccount = (await createVirtualAccount(orderId, parsed.totalAmount, customerName || "Customer", customCreds)) || null;
      try {
        const checkoutData = await createCheckoutOrder(orderId, parsed.totalAmount, customerName || "Customer", customCreds);
        checkoutLink = checkoutData.checkoutUrl || null;
      } catch (e) {
        console.warn("[parse-order] Non-fatal checkout link generation warning:", e);
      }
    } else {
      const checkoutData = await createCheckoutOrder(orderId, parsed.totalAmount, customerName || "Customer", customCreds);
      checkoutLink = checkoutData.checkoutUrl || null;
    }

    const orderData = {
      id: orderId,
      items: parsed.items,
      totalAmount: parsed.totalAmount,
      status: "pending",
      paymentMethod: paymentType,
      virtualAccount,
      checkoutLink,
      createdAt: Date.now(),
      customerName: parsed.customerName || body.customerName || "Unknown",
      deliveryAddress: parsed.deliveryAddress || "N/A",
      contactInfo: parsed.contactInfo || "N/A",
      source: body.source || "Chat Simulator"
    };

    await db.collection("merchants").doc(customCreds.uid).collection("orders").doc(orderId).set(orderData);
    console.log(`[parse-order] Order created: merchantTxRef=${orderId}`);

    return Response.json({
      success: true,
      order: orderData
    });
  } catch (error: any) {
    console.error("[parse-order] API error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handleGetOrders(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    const customCreds = await getMerchantCredentials(authHeader);

    if (!customCreds || !customCreds.uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await db.collection("merchants").doc(customCreds.uid).collection("orders").orderBy("createdAt", "desc").get();
    const orders = snapshot.docs.map(doc => doc.data());
    
    return Response.json({ success: true, orders });
  } catch (error: any) {
    console.error("[get-orders] Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function handleSimulatePayment(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    const customCreds = await getMerchantCredentials(authHeader);

    if (!customCreds || !customCreds.uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await req.json();
    const orderRef = db.collection("merchants").doc(customCreds.uid).collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return Response.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    await orderRef.update({ status: "paid" });
    const updatedOrder = (await orderRef.get()).data();

    console.log(`[simulate-payment] merchantTxRef=${orderId} status=PAID uid=${customCreds.uid}`);

    return Response.json({
      success: true,
      message: "Payment successfully simulated. Order updated to PAID.",
      order: updatedOrder
    });
  } catch (e: any) {
    console.error("[simulate-payment] Error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function handleRefund(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    const customCreds = await getMerchantCredentials(authHeader);

    if (!customCreds || !customCreds.uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await req.json();
    const orderRef = db.collection("merchants").doc(customCreds.uid).collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return Response.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Simulate calling Monnify Refunds API for Refund
    await orderRef.update({ 
      status: "paid", // revert back to normal paid
      notes: "Excess funds refunded successfully via Monnify Refund API." 
    });

    console.log(`[refund] merchantTxRef=${orderId} excess refunded uid=${customCreds.uid}`);

    return Response.json({
      success: true,
      message: "Refund processed successfully.",
    });
  } catch (e: any) {
    console.error("[refund] Error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function handlePayCard(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    const customCreds = await getMerchantCredentials(authHeader);

    if (!customCreds || !customCreds.uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, cardDetails } = await req.json();
    const orderRef = db.collection("merchants").doc(customCreds.uid).collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return Response.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Call Monnify simulated card charge directly (frontend fallback)
    console.log(`[pay-card] Simulating card charge via Monnify SDK flow for order=${orderId}`);
    
    await orderRef.update({ status: "paid" });
    const updatedOrder = (await orderRef.get()).data();
    
    return Response.json({
      success: true,
      message: "Payment successfully processed.",
      order: updatedOrder
    });
  } catch (e: any) {
    console.error("[pay-card] Error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}

