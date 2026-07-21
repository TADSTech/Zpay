# Production & Hackathon Submission Checklist (SUBMISSIONRULE.md)

This checklist contains the exact production-readiness criteria that judges and senior engineers use to evaluate Monnify integrations. If any item is unchecked, the integration is not ready for submission.

---

## 1. Security Checklist
- [x] **Secrets Management:** `secretKey` and `MONNIFY_WEBHOOK_SECRET` are strictly loaded from environment variables (`.env`). They must never be hardcoded in source control.
- [x] **Signature Verification:** All webhook receivers (`POST /webhook`) must compute the HMAC-SHA512 hash using the raw request body and verify it against the `monnify-signature` header before processing.
- [x] **Idempotency Keys:** Every external write (e.g., transfers, reserved accounts) is keyed on a unique `paymentReference` or `accountReference` to prevent double-charging or duplicate payouts.

---

## 2. Correctness Checklist
- [x] **Amount Representation:** Ensure correct amount formatting before being sent to the Monnify Checkout or Reserved Accounts APIs.
- [x] **Webhook Idempotency:** The webhook listener keeps track of received `transactionReference` / `eventId` parameters and immediately discards duplicates.
- [x] **Virtual Account Verification:** Webhook listeners compare `amountReceived` to `amountExpected` for virtual accounts, handling both under-payment (partial status) and over-payment (refund triggers) pathways.

---

## 3. Operations Checklist
- [x] **Reconciliation:** A nightly reconciliation routine is built to compare Monnify's transaction records with the local ledger to flag orphan records or amount drift.
- [x] **Structured Logging:** Every outgoing Monnify API call and incoming webhook must produce logs that tag the corresponding `paymentReference` to simplify debugging and tracking.
- [x] **Health-Check Endpoint:** A public health-check endpoint (e.g., `GET /health` or `/api/health`) must be available for judges to ping, returning a green/operational status verifying API connectivity.

