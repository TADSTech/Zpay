import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { db } from "../config/firebase";
import { useFirestoreAuthState, clearFirestoreAuthState, isFirestoreAuthRegistered } from "./whatsappAuthState";
import { processIncomingMessage } from "../controllers/whatsapp";

const logger = pino({ level: "warn" });

const RECONNECT_INTERVALS = [5000, 15000, 30000, 60000];
const RESUME_STAGGER_MS = 1500;

export type ConnectionStatus = "disconnected" | "connecting" | "qr" | "pairing" | "connected";

export interface ConnectionState {
  status: ConnectionStatus;
  qr?: string;
  pairingCode?: string;
  error?: string;
}

interface ConnectionEntry {
  sock: WASocket | null;
  status: ConnectionStatus;
  qr?: string;
  pairingCode?: string;
  error?: string;
  reconnectAttempts: number;
  isShuttingDown: boolean;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

// In-process, per-merchant live connections. Not shared across replicas —
// see plan notes on the single-instance assumption for this deployment.
const entries = new Map<string, ConnectionEntry>();

function toPublicState(entry: ConnectionEntry): ConnectionState {
  return { status: entry.status, qr: entry.qr, pairingCode: entry.pairingCode, error: entry.error };
}

export function getState(uid: string): ConnectionState {
  const entry = entries.get(uid);
  if (!entry) return { status: "disconnected" };
  return toPublicState(entry);
}

// Idempotent: if a connection attempt for this merchant is already in flight
// or live, return its current state instead of spinning up a second socket.
export async function connect(uid: string, phoneNumber?: string): Promise<ConnectionState> {
  const existing = entries.get(uid);
  if (existing && existing.status !== "disconnected") {
    return toPublicState(existing);
  }

  const entry: ConnectionEntry = {
    sock: null,
    status: "connecting",
    reconnectAttempts: 0,
    isShuttingDown: false,
    reconnectTimer: null,
  };
  entries.set(uid, entry);

  try {
    await createConnection(uid, entry, phoneNumber);
  } catch (err: any) {
    entry.status = "disconnected";
    entry.error = err?.message ?? "Failed to start connection";
  }

  return toPublicState(entry);
}

async function createConnection(uid: string, entry: ConnectionEntry, phoneNumber?: string): Promise<void> {
  const { state, saveCreds, clearState } = await useFirestoreAuthState(uid);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    mobile: false,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["ZPay", "Chrome", "121.0.0.0"],
    connectTimeoutMs: 120000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 15000,
    retryRequestDelayMs: 250,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    // Status broadcasts flood the buffer with undecryptable group-cipher
    // messages and cause "Buffer timeout reached" stalls — ignore entirely.
    shouldIgnoreJid: (jid) => jid === "status@broadcast" || jid?.endsWith("@broadcast"),
    // This bot only reacts to live incoming messages, never re-sends history —
    // an empty stub is enough to satisfy Baileys' retry-fetch protocol.
    getMessage: async () => ({ conversation: "" }),
  });

  entry.sock = sock;
  const usePairingCode = !!phoneNumber && !sock.authState.creds.registered;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !sock.authState.creds.registered) {
      if (usePairingCode) {
        try {
          const code = await sock.requestPairingCode(phoneNumber!.replace(/\D/g, ""));
          entry.status = "pairing";
          entry.pairingCode = code;
          entry.qr = undefined;
        } catch {
          entry.error = "Failed to generate pairing code";
        }
      } else {
        entry.status = "qr";
        entry.qr = qr;
        entry.pairingCode = undefined;
      }
    }

    if (connection === "open") {
      entry.status = "connected";
      entry.qr = undefined;
      entry.pairingCode = undefined;
      entry.error = undefined;
      entry.reconnectAttempts = 0;
      console.log(`[WhatsApp] uid=${uid} connection established`);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        console.warn(`[WhatsApp] uid=${uid} logged out — clearing session, manual re-pair required.`);
        await clearState();
        entry.sock = null;
        entry.status = "disconnected";
        entry.qr = undefined;
        entry.pairingCode = undefined;
        entry.reconnectAttempts = 0;
      } else if (statusCode === DisconnectReason.connectionReplaced || statusCode === 440) {
        console.error(`[WhatsApp] uid=${uid} connection replaced by another session — not reconnecting.`);
        entry.sock = null;
        entry.status = "disconnected";
      } else if (!entry.isShuttingDown) {
        try { sock.ev.removeAllListeners("connection.update"); } catch {}
        try { sock.ev.removeAllListeners("creds.update"); } catch {}
        try { sock.ev.removeAllListeners("messages.upsert"); } catch {}
        try { sock.ws.close(); } catch {}
        entry.status = "connecting";
        scheduleReconnect(uid, entry, phoneNumber);
      }
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    // "notify" is a genuinely-live incoming message. "append" (and everything
    // else) is history backfill — on a large account's first pairing this can
    // be thousands of old messages, each of which would otherwise run through
    // the Firestore + AI pipeline. Skip it entirely: we only care about
    // messages that arrive from here on.
    if (m.type !== "notify") return;
    // Also don't process anything until the socket has actually reached
    // "connected" — messages can start flowing in during the tail end of the
    // handshake, before connection.update ever reports "open".
    if (entry.status !== "connected") return;

    for (const msg of m.messages) {
      if (msg.key?.fromMe) continue;
      if (msg.key?.remoteJid === "status@broadcast") continue;
      try {
        await processIncomingMessage(uid, sock, msg);
      } catch (err) {
        console.error(`[WhatsApp] uid=${uid} message processing error:`, err);
      }
    }
  });
}

function scheduleReconnect(uid: string, entry: ConnectionEntry, phoneNumber?: string): void {
  const delay = RECONNECT_INTERVALS[Math.min(entry.reconnectAttempts, RECONNECT_INTERVALS.length - 1)];
  entry.reconnectAttempts++;
  entry.reconnectTimer = setTimeout(() => {
    createConnection(uid, entry, phoneNumber).catch((err) => {
      console.error(`[WhatsApp] uid=${uid} reconnect failed:`, err);
      entry.status = "disconnected";
      entry.error = err?.message;
    });
  }, delay);
}

export async function logout(uid: string): Promise<void> {
  const entry = entries.get(uid);

  if (entry) {
    entry.isShuttingDown = true;
    if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
    if (entry.sock) {
      try { await entry.sock.logout(); } catch {}
      try { entry.sock.ev.removeAllListeners("connection.update"); } catch {}
      try { entry.sock.ev.removeAllListeners("creds.update"); } catch {}
      try { entry.sock.ev.removeAllListeners("messages.upsert"); } catch {}
      try { entry.sock.ws.close(); } catch {}
    }
    entries.delete(uid);
  }

  await clearFirestoreAuthState(uid);

  // Reset active chat slots so a fresh pairing starts clean.
  const conversationsRef = db.collection("merchants").doc(uid).collection("whatsapp_conversations");
  const snap = await conversationsRef.get();
  if (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Boot-time resume — replaces the old Green API poller. Reconnects every
// merchant that was previously paired, staggered to avoid a startup
// thundering herd against Firestore and WhatsApp simultaneously.
export async function resumeAll(): Promise<void> {
  const merchantsSnap = await db.collection("merchants").get();
  if (merchantsSnap.empty) {
    console.log("[WhatsApp] No merchants found — nothing to resume.");
    return;
  }

  let resumed = 0;
  for (const doc of merchantsSnap.docs) {
    const uid = doc.id;
    try {
      const registered = await isFirestoreAuthRegistered(uid);
      if (!registered) continue;

      console.log(`[WhatsApp] Resuming session for uid=${uid}`);
      await connect(uid);
      resumed++;
      await delay(RESUME_STAGGER_MS);
    } catch (err) {
      console.error(`[WhatsApp] Failed to resume uid=${uid}:`, err);
    }
  }
  console.log(`[WhatsApp] Resume complete — ${resumed} session(s) reconnected.`);
}
