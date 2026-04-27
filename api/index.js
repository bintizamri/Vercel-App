const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");
const STR_HEADERS = new Set([ "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port", "host", "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "transfer-encoding", "upgrade", "forwarded", "te", "trailer", ]);
export const config = {
  runtime: "edge"
};
export default async function handler(req) {
  if (!TARGET_BASE) {
    return new Response("Misconfigure: TARGET_DOMAIN is not set", { status: 500 });
  }
  try {
    const pathStart = req.url.indexOf("/", 8);
    const targetUrl =
      pathStart === -1 ? TARGET_BASE + "/" : TARGET_BASE + req.url.slice(pathStart);
    const out = new Headers();
    let clientIp = null;
    for (const [k, v] of req.headers) {
      if (STR_HEADERS.has(k)) continue;
      if (k.startsWith("x-vercel-")) continue;
      if (k === "x-real-ip") {
        clientIp = v;
        continue;
      }
      if (k === "x-forwarded-for") {
        if (!clientIp) clientIp = v;
        continue;
      }
      out.set(k, v);
    }
    if (clientIp) out.set("x-forwarded-for", clientIp);
    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";
    return await fetch(targetUrl, {
      method,
      headers: out,
      body: hasBody ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });
  } catch (err) {
    console.error("relay error:", err);
    return new Response("Bad Gateway: Failed", { status: 502 });
  }
}
