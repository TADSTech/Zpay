# ZPay 🚀

**Zero-UI Conversational Checkout Engine powered by Monnify**

ZPay embeds checkout and payment rails directly into customer conversations (e.g. WhatsApp, DMs, SMS) using state-of-the-art Natural Language Processing and **Monnify APIs**. Customers place orders by writing plain text (e.g., *"I want 2 hoodies"*), and ZPay manages the state machine, collects delivery details, generates instant payment methods, confirms settlement via real-time webhooks, and sends receipts — all without forcing the customer to open a browser tab or download an app.

---

## 🚀 Key Features

*   **Zero-UI Conversational Flow:** Guided multi-step ordering via natural chat.
*   **Fuzzy Catalog Matching:** Advanced regex-primary matching handles typos, slangs, quantities, and stock-checks immediately with zero latency.
*   **Monnify Payments Integration:**
    *   **Reserved Accounts:** Generates a real-time unique bank account (Wema/Monnify rails) for bank transfers.
    *   **Monnify Checkout Links:** Instantly spins up a card/transfer payment link if the user prefers checkout links.
*   **Instant Webhook Verification:** Uses secure Monnify callback webhooks (HMAC-SHA512) to verify settlements instantly and release orders automatically.
*   **Merchant Portal:** A lightweight management panel to track orders, manage products/inventory, and pair WhatsApp numbers.

---

## 🛠 Tech Stack

*   **Backend Runtime:** Bun & TypeScript (Native HTTP server)
*   **Database:** Cloud Firestore (Firebase Admin SDK)
*   **AI Engine:** OpenRouter & Groq API (`meta-llama/llama-4-scout-17b-16e-instruct`) for intent enrichment and parsing.
*   **WhatsApp Bridge:** Decoupled protocol listener backed by Baileys multi-device pairing.
*   **Client Interface:** React.js & Vite with TailwindCSS (sleek dark glassmorphism theme).

---

## 🧩 Compliance with Monnify Hackathon Rules (`SUBMISSIONRULE.md`)

ZPay fully adheres to the Monnify Production & Integration compliance checklist:

1.  **Security Integration:**
    *   **No Hardcoded Secrets:** Every secret key (`secretKey`, webhook token) is fetched from system environment variables.
    *   **Cryptographic Signature Verification:** Webhook listeners strictly calculate the HMAC-SHA512 hash using the raw incoming request payload and match it against the `monnify-signature` header before executing database changes.
    *   **Idempotency Keys:** Outgoing transactions are uniquely bound to `paymentReference` or `accountReference` generated programmatically.
2.  **Correctness Standards:**
    *   **Amount Representation:** Formats amounts correctly before firing Monnify payment APIs.
    *   **Over/Under-Payment Handling:** Auto-reconciles reserved account webhook payloads to confirm if `amountReceived` matches `amountExpected`.
3.  **Operations:**
    *   **Nightly Reconciliation Job:** Scheduled reconciliation compares state stores with Monnify transactions.
    *   **Public Health Endpoint:** Exposes `GET /health` responding with real-time connectivity status, environment indicator, and Monnify API token authorization status.

---

## 📦 Setting Up Locally

### 1. Requirements
*   [Bun](https://bun.sh) v1.1+ installed.
*   A Firebase / Firestore database setup.

### 2. Configure Environment Variables
Create a `.env` file in the root directory following `.env.example`:
```env
PORT=3000
MONNIFY_API_KEY=your_api_key
MONNIFY_SECRET_KEY=your_secret_key
MONNIFY_CONTRACT_CODE=your_contract_code
MONNIFY_BASE_URL=https://sandbox.monnify.com
MONNIFY_WEBHOOK_SECRET=MonnifyHackathon2026
OPENROUTER_API_KEY=your_openrouter_key
GROQ_API_KEY=your_groq_key
```

### 3. Install and Run
```bash
# Install dependencies
bun install

# Run the dev suite (starts dev backend + cloudflare tunnel)
.\start-dev.ps1
```
The client dashboard and API server will be live on `http://localhost:3000` (and tunneled to your custom subdomain).

---

## 🧪 Running Verification Tests

To verify correctness, cryptographic verification, and adherence to the Nomba checklists:
```bash
bun test
```
All tests must pass cleanly.
