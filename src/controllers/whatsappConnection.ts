import { getUidFromHeader } from "./credentials";
import * as whatsappManager from "../services/whatsappManager";

export async function handleWhatsAppConnect(req: Request): Promise<Response> {
  try {
    const uid = await getUidFromHeader(req.headers.get("Authorization"));
    if (!uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let phoneNumber: string | undefined;
    try {
      const body: any = await req.json();
      phoneNumber = body?.phoneNumber || undefined;
    } catch {
      // No body / not JSON — QR mode.
    }

    const state = await whatsappManager.connect(uid, phoneNumber);
    return Response.json({ success: true, ...state });
  } catch (err: any) {
    console.error("[WhatsAppConnection] connect error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function handleWhatsAppStatus(req: Request): Promise<Response> {
  try {
    const uid = await getUidFromHeader(req.headers.get("Authorization"));
    if (!uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const state = whatsappManager.getState(uid);
    return Response.json({ success: true, ...state });
  } catch (err: any) {
    console.error("[WhatsAppConnection] status error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function handleWhatsAppDisconnect(req: Request): Promise<Response> {
  try {
    const uid = await getUidFromHeader(req.headers.get("Authorization"));
    if (!uid) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await whatsappManager.logout(uid);
    return Response.json({ success: true, message: "Logged out and cleared active chat slots." });
  } catch (err: any) {
    console.error("[WhatsAppConnection] disconnect error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
