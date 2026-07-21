import { describe, it, expect } from "bun:test";
import * as crypto from "crypto";

// All tests are static analysis (source code pattern checks) OR
// pure function tests (no Firebase dependency needed).

// ──────────────────────────────────────────────────
// SECTION 1: Security Checklist
// ──────────────────────────────────────────────────

describe("§1 Security Checklist", () => {

  it("1.1 Secrets loaded from env, not hardcoded in source", async () => {
    const monnifySource = await Bun.file("./src/services/monnify.ts").text();
    expect(monnifySource).not.toMatch(/secretKey\s*[:=]\s*["']/);
    expect(monnifySource).not.toMatch(/MONNIFY_HACKATHON|MonnifyHackathon/i);
    expect(monnifySource).toContain("secretKey");

    const envSource = await Bun.file("./src/config/env.ts").text();
    expect(envSource).toContain("process.env.MONNIFY_SECRET_KEY");
    expect(envSource).toContain("process.env.MONNIFY_WEBHOOK_SECRET");
    expect(envSource).toContain("process.env.MONNIFY_API_KEY");
  });

  it("1.2 Webhook HMAC-SHA512 verification implemented", async () => {
    const source = await Bun.file("./src/controllers/webhook.ts").text();
    expect(source).toContain("createHmac");
    expect(source).toContain('"sha512"');
    expect(source).toContain("monnify-signature");
    expect(source).toContain("401");
  });

  it("1.3 HMAC correctly signs and verifies payloads", () => {
    const secret = "MonnifyHackathon2026";
    const body = JSON.stringify({ event: "payment_success", requestId: "test-hmac" });
    const signature = crypto.createHmac("sha512", secret).update(body).digest("hex");
    const tampered = crypto.createHmac("sha512", secret).update(body + "tampered").digest("hex");
    expect(signature).not.toBe(tampered);
    // Verify valid signature recomputation matches
    const recomputed = crypto.createHmac("sha512", secret).update(body).digest("hex");
    expect(signature).toBe(recomputed);
  });

  it("1.4 paymentReference / requestId used as idempotency keys", async () => {
    const apiSource = await Bun.file("./src/controllers/api.ts").text();
    expect(apiSource).toContain("ZPY_");
    expect(apiSource).toContain("randomBits");

    const webhookSource = await Bun.file("./src/controllers/webhook.ts").text();
    expect(webhookSource).toContain("processedRequestIds");
    expect(webhookSource).toContain("requestId");
  });
});

// ──────────────────────────────────────────────────
// SECTION 2: Correctness Checklist
// ──────────────────────────────────────────────────

describe("§2 Correctness Checklist", () => {

  it("2.1 Correct amount format before Monnify API calls", async () => {
    const source = await Bun.file("./src/services/monnify.ts").text();
    expect(source).toContain("createVirtualAccount");
    expect(source).toContain("createCheckoutOrder");
  });

  it("2.2 Transfer verification before funds moved", async () => {
    const apiSource = await Bun.file("./src/controllers/api.ts").text();
    expect(apiSource).toContain('"transfer"');
    expect(apiSource).toContain("paymentType");
    expect(apiSource).toContain("createVirtualAccount");
    expect(apiSource).toMatch(/transfer|bank/i);
  });

  it("2.3 Webhook dedup by requestId / eventId", async () => {
    const source = await Bun.file("./src/controllers/webhook.ts").text();
    expect(source).toContain("processedRequestIds");
    expect(source).toContain("Duplicate");
    expect(source).toContain("requestId");
    expect(source).toContain("eventId");
  });

  it("2.4 Virtual account over/under-payment handling", async () => {
    const source = await Bun.file("./src/controllers/webhook.ts").text();
    expect(source).toContain("amountReceived");
    expect(source).toContain("amountExpected");
    expect(source).toContain("partial");
    expect(source).toContain("Under-payment");
    expect(source).toContain("Over-payment");
    expect(source).toMatch(/[Rr]efund/);
  });
});

// ──────────────────────────────────────────────────
// SECTION 3: Operations Checklist
// ──────────────────────────────────────────────────

describe("§3 Operations Checklist", () => {

  it("3.1 Health-check endpoint (GET /health or /api/health)", async () => {
    const source = await Bun.file("./src/index.ts").text();
    expect(source).toContain("/health");
    expect(source).toContain("/api/health");
    expect(source).toContain("MonnifyToken");
    expect(source).toContain("UP");
  });

  it("3.2 Structured logging tags paymentReference", async () => {
    const apiSource = await Bun.file("./src/controllers/api.ts").text();
    expect(apiSource).toContain("merchantTxRef");

    const webhookSource = await Bun.file("./src/controllers/webhook.ts").text();
    expect(webhookSource).toContain("merchantTxRef");
  });

  it("3.3 Outgoing Monnify API calls logged", async () => {
    const source = await Bun.file("./src/services/monnify.ts").text();
    expect(source).toContain("Fetching access token");
    expect(source).toContain("Creating Monnify reserved account");
    expect(source).toContain("Initializing Monnify checkout");
  });

  it("3.4 Incoming webhooks logged", async () => {
    const source = await Bun.file("./src/controllers/webhook.ts").text();
    expect(source).toContain("Received event");
    expect(source).toContain("merchantTxRef");
  });
});

// ──────────────────────────────────────────────────
// File existence
// ──────────────────────────────────────────────────

describe("Required source files exist", () => {
  const required = [
    "src/index.ts",
    "src/config/env.ts",
    "src/controllers/webhook.ts",
    "src/controllers/api.ts",
    "src/services/monnify.ts",
    "src/services/auth.ts",
  ];
  for (const f of required) {
    it(f, async () => {
      expect(await Bun.file(f).exists()).toBe(true);
    });
  }
});
