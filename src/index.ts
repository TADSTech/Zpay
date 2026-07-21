import { PORT } from "./config/env";
import { getMonnifyToken } from "./services/monnify";
import { handleParseOrder, handleGetOrders, handleSimulatePayment, handleRefund, handlePayCard } from "./controllers/api";
import { handleSaveCredentials, handleGetCredentials } from "./controllers/credentials";
import { handleWebhook } from "./controllers/webhook";
import { handleInitMerchant } from "./controllers/merchant";
import { handleProductsApi } from "./controllers/products";
import { handleWhatsAppConnect, handleWhatsAppStatus, handleWhatsAppDisconnect } from "./controllers/whatsappConnection";
import * as whatsappManager from "./services/whatsappManager";
import * as path from "path";


const DIST_DIR = path.resolve(import.meta.dir, "../dist");

// Start Bun Serve
Bun.serve({
  port: Number(PORT),
  async fetch(req) {
    const url = new URL(req.url);

    // Health Check Endpoint (SUBMISSIONRULE §3)
    if ((url.pathname === "/health" || url.pathname === "/api/health") && req.method === "GET") {
      try {
        const token = await getMonnifyToken();
        return Response.json({
          status: "UP",
          environment: process.env.MONNIFY_BASE_URL?.includes("sandbox") ? "sandbox" : "production",
          monnifyConnection: token ? "connected" : "failed",
          timestamp: new Date().toISOString()
        });
      } catch (err: any) {
        return Response.json({
          status: "DOWN",
          monnifyConnection: "failed",
          error: err.message,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    // Keep-alive endpoint for cronjob.org
    if ((url.pathname === "/ping" || url.pathname === "/api/keep-alive") && req.method === "GET") {
      return Response.json({ status: "alive", timestamp: new Date().toISOString() });
    }

    // API Routes
    if (url.pathname === "/api/parse-order" && req.method === "POST") {
      return handleParseOrder(req);
    }
    if (url.pathname === "/api/save-credentials" && req.method === "POST") {
      return handleSaveCredentials(req);
    }
    if (url.pathname === "/api/get-credentials" && req.method === "GET") {
      return handleGetCredentials(req);
    }
    if (url.pathname === "/api/whatsapp/connect" && req.method === "POST") {
      return handleWhatsAppConnect(req);
    }
    if (url.pathname === "/api/whatsapp/status" && req.method === "GET") {
      return handleWhatsAppStatus(req);
    }
    if (url.pathname === "/api/whatsapp/logout" && req.method === "POST") {
      return handleWhatsAppDisconnect(req);
    }
    if (url.pathname === "/api/orders" && req.method === "GET") {
      return handleGetOrders(req);
    }
    if (url.pathname === "/api/simulate-payment" && req.method === "POST") {
      return handleSimulatePayment(req);
    }
    if (url.pathname === "/api/refund" && req.method === "POST") {
      return handleRefund(req);
    }
    if (url.pathname === "/api/pay-card" && req.method === "POST") {
      return handlePayCard(req);
    }
    if (url.pathname === "/api/init-merchant" && req.method === "POST") {
      return handleInitMerchant(req);
    }
    if (url.pathname.startsWith("/api/products")) {
      return handleProductsApi(req, req.method, url);
    }
    
    // Webhook Route
    if (url.pathname === "/webhook") {
      return handleWebhook(req);
    }

    // Serve static assets from dist/ (Vite build output)
    if (url.pathname !== "/" && !url.pathname.startsWith("/api/")) {
      try {
        const filePath = path.join(DIST_DIR, url.pathname);
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const ext = path.extname(url.pathname).toLowerCase();
          const mimeTypes: Record<string, string> = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "application/javascript",
            ".mjs": "application/javascript",
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
            ".woff": "font/woff",
            ".woff2": "font/woff2",
            ".ttf": "font/ttf",
          };
          return new Response(file, {
            headers: { "Content-Type": mimeTypes[ext] || "application/octet-stream" },
          });
        }
      } catch {
        // Fall through to SPA fallback
      }
    }

    // SPA Fallback — serve index.html for all non-API, non-static routes
    // This enables React Router to handle client-side routing
    try {
      const indexPath = path.join(DIST_DIR, "index.html");
      const indexFile = Bun.file(indexPath);
      if (await indexFile.exists()) {
        return new Response(indexFile, {
          headers: { "Content-Type": "text/html" },
        });
      }
    } catch {
      // dist not built yet
    }

    // Fallback: try old public/ directory for dev compatibility
    try {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const htmlFile = Bun.file("./public/index.html");
        if (await htmlFile.exists()) {
          return new Response(htmlFile, { headers: { "Content-Type": "text/html" } });
        }
      }
    } catch {
      // ignore
    }

    return new Response("Not Found — Run 'bun run build' to generate the frontend.", { status: 404 });
  },
});

console.log(`\n🚀 ZPay Zero-UI Payment Server running at http://localhost:${PORT}\n`);

// ─── Baileys session resume ──────────────────────────────────────────────────
// Reconnects every merchant that was previously paired (Firestore-backed auth
// state survives restarts even though the filesystem doesn't).
whatsappManager.resumeAll().catch((err) => {
  console.error("[WhatsApp] resumeAll failed:", err);
});

