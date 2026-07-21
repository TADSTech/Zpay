import { FIREBASE_CONFIG } from "../config/env";

export async function handleStatic(req: Request): Promise<Response | null> {
  const url = new URL(req.url);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      let htmlText = await Bun.file("./public/index.html").text();
      htmlText = htmlText.replace("__FIREBASE_CONFIG__", JSON.stringify(FIREBASE_CONFIG));
      return new Response(htmlText, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (e: any) {
      return new Response(`Error loading index.html: ${e.message}`, { status: 500 });
    }
  }

  if (url.pathname === "/style.css") {
    return new Response(Bun.file("./public/style.css"), {
      headers: { "Content-Type": "text/css" },
    });
  }

  return null; // Not a static file route
}
