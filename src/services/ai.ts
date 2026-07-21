
import { OPENROUTER_API_KEY, GROQ_API_KEY } from "../config/env";
import { db } from "../config/firebase";

export async function parseChatIntent(message: string, uid: string, history: Array<{ sender: string, text: string }> = []) {
  // Fetch merchant's custom products
  const snapshot = await db.collection("merchants").doc(uid).collection("products").get();
  const catalog = snapshot.docs.map(doc => doc.data());
  
  // Fetch merchant's settings (for custom out of stock message)
  const settingsDoc = await db.collection("merchants").doc(uid).collection("config").doc("settings").get();
  const notAvailableMessage = settingsDoc.exists ? settingsDoc.data()?.notAvailableMessage || "Item is not available." : "Item is not available.";

  const historyText = history.map(h => `${h.sender}: ${h.text}`).join("\n");
  const prompt = `You are ZPay's AI order parser.
Previous Conversation Context:
${historyText}

Analyze this latest user message: "${message}"

Your task is to identify if the user wants to buy something, what products they want, the quantities, and their delivery details.
Our current product catalog is: ${JSON.stringify(catalog)}.

Rules:
1. Match the products requested in the message to the closest items in the catalog (be forgiving with typos).
2. For each matched product, determine the quantity requested.
3. Check the "stockQuantity" of the matched product. If it is 0, DO NOT add it to "items", but set the "error" field to exactly this: "${notAvailableMessage}". If the requested quantity is greater than the stockQuantity, also set the "error" field to: "Sorry, we only have " + stockQuantity + " of that in stock."
4. Calculate the totalAmount by summing (price * quantity) for all matched items.
5. Check if we have the user's delivery address from the current or previous messages. If we DO NOT have a delivery address, DO NOT set "intent" to "purchase" yet. Instead, set "missingInfo" to a natural question asking for their delivery address (e.g., "Where should we deliver this to?").
6. If they ask for something clearly NOT in the catalog at all, DO NOT add it to "items", but set the "error" field to exactly this: "${notAvailableMessage}". Otherwise, leave "error" empty.
7. If you found items to buy AND have a delivery address AND contact details, set intent to "purchase". If contact detail (phone/email) is missing, ask for it in "missingInfo".

Respond ONLY with a raw JSON object (no markdown, no backticks). Schema:
{
  "intent": "purchase" | "inquiry" | "other",
  "items": [
    { "product": "exact catalog name", "qty": number, "price": number }
  ],
  "totalAmount": number,
  "customerName": "string or null",
  "deliveryAddress": "string or null",
  "contactInfo": "string or null",
  "missingInfo": "string or null",
  "error": "string or null"
}`;

  // 1. Try OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      console.log("[ai] Attempting parse via OpenRouter...");
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "";
        const cleanJson = text.replace(/```json/i, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
      }
      throw new Error(`OpenRouter API responded with ${response.status}`);
    } catch (e) {
      console.warn("[ai] OpenRouter parsing failed, trying Groq fallback: ", e);
    }
  }

  // 2. Try Groq Fallback
  if (GROQ_API_KEY) {
    try {
      console.log("[ai] Attempting parse via Groq...");
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "";
        const cleanJson = text.replace(/```json/i, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
      }
      throw new Error(`Groq API responded with ${response.status}`);
    } catch (e) {
      console.warn("[ai] Groq parsing failed, falling back to regex: ", e);
    }
  }

  // 3. Regex Fallback
  console.log("[ai] Running regex-based parser fallback...");
  const msgLower = message.toLowerCase();
  const matchedItems: any[] = [];
  let totalAmount = 0;

  // Helper to scan a text for catalog items
  const scanForItems = (text: string) => {
    const txtLower = text.toLowerCase();
    for (const item of catalog) {
      const prodWords = item.name.toLowerCase().split(" ");
      const matchesAllWords = prodWords.every((word: string) => txtLower.includes(word));
      
      if (matchesAllWords) {
        let qty = 1;
        const regex = new RegExp(`(\\d+)\\s*(?:${prodWords.join("|")})`, "i");
        const match = text.match(regex);
        if (match && match[1]) {
          qty = parseInt(match[1]);
        }
        
        if (!matchedItems.some(mi => mi.product === item.name)) {
          matchedItems.push({
            product: item.name,
            qty: qty,
            price: item.price
          });
          totalAmount += item.price * qty;
        }
      }
    }
  };

  // 1. Scan current message for items
  scanForItems(message);

  // 2. If no items found, scan history for items
  if (matchedItems.length === 0 && history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].sender === "user") {
        scanForItems(history[i].text);
      }
      if (matchedItems.length > 0) break;
    }
  }

  // 3. Extract delivery address & contact details from message + history
  let deliveryAddress: string | null = null;
  let contactInfo: string | null = null;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+?234|0)[789]\d{9}/;

  const allTexts = [message, ...history.map(h => h.text)];

  for (const text of allTexts) {
    if (!contactInfo) {
      const emailMatch = text.match(emailRegex);
      const phoneMatch = text.match(phoneRegex);
      if (emailMatch && phoneMatch) {
        contactInfo = `${phoneMatch[0]}, ${emailMatch[0]}`;
      } else if (emailMatch) {
        contactInfo = emailMatch[0];
      } else if (phoneMatch) {
        contactInfo = phoneMatch[0];
      }
    }

    if (!deliveryAddress) {
      const lowerText = text.toLowerCase();
      if (
        lowerText.includes("stay at") || 
        lowerText.includes("deliver to") || 
        lowerText.includes("address") || 
        lowerText.includes("street") || 
        lowerText.includes("road") || 
        lowerText.includes("lagos") || 
        lowerText.includes("mushin") ||
        lowerText.includes("ikeja")
      ) {
        let cleanText = text
          .replace(/i stay at/i, "")
          .replace(/deliver to/i, "")
          .replace(/my address is/i, "")
          .replace(/here is my address/i, "")
          .trim();
        // Strip out email and phone to avoid mixing them in address
        cleanText = cleanText
          .replace(emailRegex, "")
          .replace(phoneRegex, "")
          .replace(/phone|email|and|respectively/gi, "")
          .replace(/,\s*,/g, ",")
          .trim();
        
        if (cleanText.length > 4) {
          deliveryAddress = cleanText;
        }
      }
    }
  }

  // 4. If we found items but no numbers, maybe they wanted something completely out of stock
  if (matchedItems.length === 0 && message.match(/\d/) && !emailRegex.test(message) && !phoneRegex.test(message)) {
    return {
      intent: "other",
      items: [],
      totalAmount: 0,
      error: notAvailableMessage
    };
  }

  // 5. Determine missing information questions
  let missingInfo: string | null = null;
  let intent = "inquiry";

  if (matchedItems.length > 0) {
    if (!deliveryAddress) {
      intent = "inquiry";
      missingInfo = "Where should we deliver this to?";
    } else if (!contactInfo) {
      intent = "inquiry";
      missingInfo = "Could you please provide a phone number or email for contact?";
    } else {
      intent = "purchase";
    }
  }

  return {
    intent,
    items: matchedItems,
    totalAmount,
    deliveryAddress,
    contactInfo,
    missingInfo
  };
}
