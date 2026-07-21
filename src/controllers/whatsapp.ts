import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { db } from "../config/firebase";
import { parseChatIntent } from "../services/ai";
import { createVirtualAccount, createCheckoutOrder } from "../services/monnify";

// ─── Buying intent detection (regex pre-filter) ──────────────────────────────
const BUY_INTENT_REGEX = /\b(buy|order|purchase|want|need|get me|send me|i'?d like|i want|gimme|give me|add to|checkout|i'll take|please send|abeg send)\b/i;

function hasBuyingIntent(text: string): boolean {
  return BUY_INTENT_REGEX.test(text);
}

// ─── Regex-first catalog item matcher ────────────────────────────────────────
// Scans user message against a live catalog and extracts items + quantities.
// This is the primary parser for WhatsApp - fast, free, zero latency.
async function matchItemsFromCatalog(
  text: string,
  uid: string,
  history: Array<{ sender: string; text: string }> = []
): Promise<{ items: any[]; totalAmount: number; error?: string }> {
  const snapshot = await db.collection("merchants").doc(uid).collection("products").get();
  const catalog = snapshot.docs.map(doc => doc.data());

  const settingsDoc = await db.collection("merchants").doc(uid).collection("config").doc("settings").get();
  const notAvailableMessage = settingsDoc.exists
    ? settingsDoc.data()?.notAvailableMessage || "Sorry, that item is not available."
    : "Sorry, that item is not available.";

  const matchedItems: any[] = [];
  let totalAmount = 0;
  let error: string | undefined;

  // Scan text + last 3 user history messages for items
  const textsToScan = [
    text,
    ...history.filter(h => h.sender === "user").slice(-3).map(h => h.text)
  ];

  for (const scanText of textsToScan) {
    const txtLower = scanText.toLowerCase();

    for (const item of catalog) {
      if (matchedItems.some(m => m.product === item.name)) continue;

      const prodWords = (item.name as string).toLowerCase().split(/\s+/);
      // Need at least 60% of words to match (fuzzy tolerance)
      const matchCount = prodWords.filter((w: string) => txtLower.includes(w)).length;
      if (matchCount < Math.ceil(prodWords.length * 0.6)) continue;

      // Check stock
      if (item.stockQuantity === 0) {
        error = notAvailableMessage;
        continue;
      }

      // Extract quantity (e.g. "2 hoodies", "a tote")
      let qty = 1;
      const qtyBefore = scanText.match(new RegExp(`(\\d+)\\s+(?:${prodWords.join("|")})`, "i"));
      const qtyAfter  = scanText.match(new RegExp(`(?:${prodWords.join("|")})\\s+x\\s*(\\d+)`, "i"));
      const wordQty   = scanText.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
      const wordMap: Record<string, number> = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 };

      if (qtyBefore?.[1]) qty = parseInt(qtyBefore[1]);
      else if (qtyAfter?.[1]) qty = parseInt(qtyAfter[1]);
      else if (wordQty?.[1]) qty = wordMap[wordQty[1].toLowerCase()] || 1;

      // Cap at available stock
      if (item.stockQuantity && qty > item.stockQuantity) {
        error = `Sorry, we only have ${item.stockQuantity} of ${item.name} in stock.`;
        qty = item.stockQuantity;
      }

      matchedItems.push({ product: item.name, qty, price: item.price });
      totalAmount += item.price * qty;
    }

    if (matchedItems.length > 0) break; // Stop scanning history once we have items
  }

  return { items: matchedItems, totalAmount, error };
}

// ─── Try AI for richer parsing (optional enhancement — never blocks) ──────────
async function tryAIEnhancement(
  message: string,
  uid: string,
  history: Array<{ sender: string; text: string }>
): Promise<any | null> {
  try {
    const result = await Promise.race([
      parseChatIntent(message, uid, history),
      new Promise((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 5000))
    ]);
    return result;
  } catch {
    return null; // AI failed or timed out — no problem
  }
}

// ─── Conversation state machine stages ──────────────────────────────────────
type Stage =
  | "idle"
  | "collecting_items"
  | "collecting_address"
  | "collecting_contact"
  | "collecting_landmark"
  | "awaiting_payment_method"
  | "order_placed";

interface ConversationState {
  stage: Stage;
  messages: Array<{ sender: string; text: string }>;
  pendingOrder?: {
    items: any[];
    totalAmount: number;
    customerName: string;
    deliveryAddress?: string;
    landmark?: string;
    contactInfo?: string;
    orderId?: string;
  };
}

// ─── Format currency ─────────────────────────────────────────────────────────
function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

// ─── Send a reply on the merchant's own Baileys socket ───────────────────────
async function reply(sock: WASocket, jid: string, text: string): Promise<void> {
  try {
    await sock.sendMessage(jid, { text });
  } catch (err) {
    console.error(`[WhatsApp] Failed to send message to ${jid}:`, err);
  }
}

// ─── Build a receipt string ───────────────────────────────────────────────────
function buildReceipt(order: any): string {
  let msg = `✅ *Order Confirmed! (Ref: #${order.orderId})*\n\n`;
  msg += `📦 *Items:*\n`;
  msg += order.items.map((i: any) => `  - ${i.qty}x ${i.product} — ${formatNaira(i.price * i.qty)}`).join("\n");
  msg += `\n\n💰 *Total:* ${formatNaira(order.totalAmount)}`;
  msg += `\n📍 *Delivery to:* ${order.deliveryAddress}${order.landmark ? ` (${order.landmark})` : ""}`;
  msg += `\n📞 *Contact:* ${order.contactInfo}`;
  return msg;
}

function extractMessageText(message: WAMessage["message"]): string {
  if (!message) return "";
  return message.conversation || message.extendedTextMessage?.text || "";
}

// ─── Main handler — called directly by whatsappManager on messages.upsert ───
// No HTTP hop: the manager already knows which merchant (uid) owns this socket,
// so there's no webhook payload to parse and no merchant to guess at.
export async function processIncomingMessage(uid: string, sock: WASocket, msg: WAMessage): Promise<void> {
  try {
    const remoteJid = msg.key?.remoteJid;
    if (!remoteJid) return;

    const userMessage = extractMessageText(msg.message);
    if (!userMessage.trim()) return; // No text content to parse (media, reactions, etc.)

    const customerPhone = remoteJid.split("@")[0] || "";
    const customerName = msg.pushName || "Customer";

    console.log(`[WhatsApp] uid=${uid} jid=${remoteJid} message="${userMessage}"`);

    // ── Load conversation state from Firestore ────────────────────────────
    const stateRef = db.collection("merchants").doc(uid).collection("whatsapp_conversations").doc(remoteJid);
    const stateSnap = await stateRef.get();

    // Free tier: cap at 3 concurrent conversations
    if (!stateSnap.exists) {
      const activeChatsSnap = await db.collection("merchants").doc(uid).collection("whatsapp_conversations").get();
      if (activeChatsSnap.size >= 3) {
        console.warn(`[WhatsApp] 3-chat limit reached. Rejecting jid=${remoteJid}`);
        await reply(sock, remoteJid, "⚠️ Our chat system is currently at capacity. Please try again shortly.");
        return;
      }
    }

    const state: ConversationState = stateSnap.exists
      ? (stateSnap.data() as ConversationState)
      : { stage: "idle", messages: [] };

    // Keep history bounded to last 20 messages
    if (state.messages.length > 20) {
      state.messages = state.messages.slice(-20);
    }

    const msgLower = userMessage.toLowerCase().trim();

    // ── STATE MACHINE ────────────────────────────────────────────────────

    // ── Stage: awaiting_payment_method ───────────────────────────────────────
    if (state.stage === "awaiting_payment_method" && state.pendingOrder) {
      const orderId = state.pendingOrder.orderId!;

      if (msgLower.includes("bank") || msgLower.includes("transfer") || msgLower === "1") {
        // Generate virtual account
        const virtualAccount = await createVirtualAccount(
          orderId, state.pendingOrder.totalAmount, state.pendingOrder.customerName
        );

        const orderData = {
          id: orderId,
          items: state.pendingOrder.items,
          totalAmount: state.pendingOrder.totalAmount,
          status: "pending",
          paymentMethod: "transfer",
          virtualAccount: virtualAccount || null,
          checkoutLink: null,
          createdAt: Date.now(),
          customerName: state.pendingOrder.customerName,
          deliveryAddress: `${state.pendingOrder.deliveryAddress}${state.pendingOrder.landmark ? ` (near ${state.pendingOrder.landmark})` : ""}`,
          contactInfo: state.pendingOrder.contactInfo || customerPhone || "N/A",
          source: "WhatsApp"
        };

        await db.collection("merchants").doc(uid).collection("orders").doc(orderId).set(orderData);

        const receipt = buildReceipt({ ...state.pendingOrder, orderId });
        let payMsg = `${receipt}\n\n`;
        payMsg += `🏦 *Bank Transfer Details:*\n`;
        payMsg += `  Bank: *${virtualAccount.bankName}*\n`;
        payMsg += `  Account Number: *${virtualAccount.accountNumber}*\n`;
        payMsg += `  Account Name: *${virtualAccount.accountName}*\n\n`;
        payMsg += `📲 Transfer exactly *${formatNaira(state.pendingOrder.totalAmount)}* using any bank app.\n`;
        payMsg += `Your order will be confirmed automatically once payment is received. ✅`;

        await reply(sock, remoteJid, payMsg);
        state.messages.push({ sender: "user", text: userMessage });
        state.messages.push({ sender: "bot", text: payMsg });
        state.stage = "order_placed";
        state.pendingOrder = undefined;
        await stateRef.set(state);
        return;
      }

      if (msgLower.includes("card") || msgLower.includes("link") || msgLower.includes("pay") || msgLower === "2") {
        // Generate checkout link
        const checkoutData = await createCheckoutOrder(
          orderId, state.pendingOrder.totalAmount, state.pendingOrder.customerName
        );
        const checkoutLink = checkoutData.checkoutLink || checkoutData.checkoutUrl || checkoutData.link || null;

        const orderData = {
          id: orderId,
          items: state.pendingOrder.items,
          totalAmount: state.pendingOrder.totalAmount,
          status: "pending",
          paymentMethod: "card",
          virtualAccount: null,
          checkoutLink,
          createdAt: Date.now(),
          customerName: state.pendingOrder.customerName,
          deliveryAddress: `${state.pendingOrder.deliveryAddress}${state.pendingOrder.landmark ? ` (near ${state.pendingOrder.landmark})` : ""}`,
          contactInfo: state.pendingOrder.contactInfo || customerPhone || "N/A",
          source: "WhatsApp"
        };

        await db.collection("merchants").doc(uid).collection("orders").doc(orderId).set(orderData);

        const receipt = buildReceipt({ ...state.pendingOrder, orderId });
        let payMsg = `${receipt}\n\n`;
        payMsg += `💳 *Payment Link:*\n${checkoutLink || "Could not generate link. Please try bank transfer instead."}\n\n`;
        payMsg += `Click the link above to pay securely with your card. ✅`;

        await reply(sock, remoteJid, payMsg);
        state.messages.push({ sender: "user", text: userMessage });
        state.messages.push({ sender: "bot", text: payMsg });
        state.stage = "order_placed";
        state.pendingOrder = undefined;
        await stateRef.set(state);
        return;
      }

      // Did not pick a valid option
      await reply(sock, remoteJid, `Please reply with:\n*1* for Bank Transfer 🏦\n*2* for Payment Link (Card) 💳`);
      return;
    }

    // ── Stage: collecting_landmark ────────────────────────────────────────────
    if (state.stage === "collecting_landmark" && state.pendingOrder) {
      state.pendingOrder.landmark = userMessage.trim();
      state.messages.push({ sender: "user", text: userMessage });

      const q = `📞 Almost there! What's the best phone number or email to reach you on for delivery coordination?`;
      await reply(sock, remoteJid, q);
      state.messages.push({ sender: "bot", text: q });
      state.stage = "collecting_contact";
      await stateRef.set(state);
      return;
    }

    // ── Stage: collecting_contact ─────────────────────────────────────────────
    if (state.stage === "collecting_contact" && state.pendingOrder) {
      state.pendingOrder.contactInfo = userMessage.trim();
      state.messages.push({ sender: "user", text: userMessage });

      // All info collected — ask payment method
      const orderId = "ZPY_wa_" + uid.substring(0, 6) + "_" + Math.floor(100000 + Math.random() * 900000);
      state.pendingOrder.orderId = orderId;

      const summary = buildReceipt({ ...state.pendingOrder, orderId });
      let paymentQ = `${summary}\n\n`;
      paymentQ += `💬 How would you like to pay?\n\n`;
      paymentQ += `Reply *1* → 🏦 Bank Transfer (Instant NUBAN account generated)\n`;
      paymentQ += `Reply *2* → 💳 Payment Link (Secure card payment)`;

      await reply(sock, remoteJid, paymentQ);
      state.messages.push({ sender: "bot", text: paymentQ });
      state.stage = "awaiting_payment_method";
      await stateRef.set(state);
      return;
    }

    // ── Stage: collecting_address ─────────────────────────────────────────────
    if (state.stage === "collecting_address" && state.pendingOrder) {
      state.pendingOrder.deliveryAddress = userMessage.trim();
      state.messages.push({ sender: "user", text: userMessage });

      const q = `📍 Got it! Any nearby landmark or additional address detail to help our rider find you easily? (or reply *skip* to continue)`;
      await reply(sock, remoteJid, q);
      state.messages.push({ sender: "bot", text: q });
      state.stage = "collecting_landmark";
      await stateRef.set(state);
      return;
    }

    // ── Stage: collecting_items / idle ────────────────────────────────────────
    // Run regex pre-filter: don't even try if there is no buying intent
    if (state.stage === "idle" && !hasBuyingIntent(userMessage)) {
      const greet = `👋 Hi ${customerName}! I'm the ZPay Shopping Assistant.\n\nTell me what you'd like to order and I'll take care of everything! 🛒`;
      await reply(sock, remoteJid, greet);
      state.messages.push({ sender: "user", text: userMessage });
      state.messages.push({ sender: "bot", text: greet });
      await stateRef.set(state);
      return;
    }

    // ── PRIMARY: Regex catalog matcher ───────────────────────────────────────
    // Run regex first — instant, zero latency, zero cost.
    const regexResult = await matchItemsFromCatalog(userMessage, uid, state.messages);
    console.log("[WhatsApp] Regex result:", JSON.stringify(regexResult));

    // ── OPTIONAL ENHANCEMENT: Try AI concurrently (5s timeout) ───────────────
    // Fire AI in the background but DO NOT await it blocking the response.
    // If AI returns better results (more items, better name match), we use them.
    const aiResultPromise = tryAIEnhancement(userMessage, uid, state.messages);

    // Use regex result as our working baseline
    let items = regexResult.items;
    let totalAmount = regexResult.totalAmount;

    // Wait for AI but cap at 5s (already capped inside tryAIEnhancement)
    const aiResult = await aiResultPromise;
    if (aiResult && aiResult.items && aiResult.items.length >= items.length) {
      // AI returned at least as many items — use AI result if it's richer
      items = aiResult.items;
      totalAmount = aiResult.totalAmount;
      console.log("[WhatsApp] AI enhancement applied.");
    } else {
      console.log("[WhatsApp] Using regex result (AI skipped or regex was better).");
    }

    state.messages.push({ sender: "user", text: userMessage });

    // ── Handle stock error ───────────────────────────────────────────────────
    if (regexResult.error && items.length === 0) {
      await reply(sock, remoteJid, `⚠️ ${regexResult.error}`);
      state.messages.push({ sender: "bot", text: `⚠️ ${regexResult.error}` });
      await stateRef.set(state);
      return;
    }

    // ── No items found ───────────────────────────────────────────────────────
    if (items.length === 0) {
      const fallback = `👋 Hi ${customerName}! I'm the ZPay Shopping Assistant.\n\nJust tell me what you'd like to order — for example:\n_"I want 2 black hoodies and a tote bag"_ 🛒`;
      await reply(sock, remoteJid, fallback);
      state.messages.push({ sender: "bot", text: fallback });
      await stateRef.set(state);
      return;
    }

    // ── Items found — store and start address collection ─────────────────────
    state.pendingOrder = {
      items,
      totalAmount,
      customerName: aiResult?.customerName || customerName,
    };
    state.stage = "collecting_address";

    let itemSummary = `🛒 *Got it, ${aiResult?.customerName || customerName}!* Here's what I have:\n\n`;
    itemSummary += items.map((i: any) => `  - ${i.qty}x ${i.product} — ${formatNaira(i.price * i.qty)}`).join("\n");
    if (regexResult.error) itemSummary += `\n\n⚠️ ${regexResult.error}`; // partial stock warning
    itemSummary += `\n\n💰 *Subtotal:* ${formatNaira(totalAmount)}\n\n`;
    itemSummary += `📍 Where should we deliver this to? (Please give your full address)`;

    await reply(sock, remoteJid, itemSummary);
    state.messages.push({ sender: "bot", text: itemSummary });
    await stateRef.set(state);

  } catch (error: any) {
    console.error("[WhatsApp] Crash Error:", error);
  }
}
