import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7).trim();
}

async function hashToken(token: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Handshake Endpoint
http.route({
  path: "/sync/handshake",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const tokenHash = await hashToken(token);

      const result = await ctx.runMutation(api.sync.handshake, {
        tokenHash,
        accountNumber: body.accountNumber,
        broker: body.broker,
        server: body.server,
        currency: body.currency,
        leverage: body.leverage,
        balance: body.balance,
        equity: body.equity,
        utcOffsetMinutes: body.utcOffsetMinutes,
        accountName: body.accountName,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("[sync] Handshake error:", err);
      return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
        status: err.message === "Invalid sync token" ? 401 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Heartbeat Endpoint
http.route({
  path: "/sync/heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const tokenHash = await hashToken(token);

      const result = await ctx.runMutation(api.sync.heartbeat, {
        tokenHash,
        balance: body.balance,
        equity: body.equity,
        margin: body.margin ?? 0,
        freeMargin: body.freeMargin ?? 0,
        openPositions: body.openPositions ?? 0,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("[sync] Heartbeat error:", err);
      return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
        status: err.message === "Invalid sync token" ? 401 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Deals Endpoint
http.route({
  path: "/sync/deals",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const tokenHash = await hashToken(token);

      const result = await ctx.runMutation(api.sync.deals, {
        tokenHash,
        deals: body.deals ?? [],
        openPositions: body.openPositions ?? [],
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("[sync] Deals error:", err);
      return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
        status: err.message === "Invalid sync token" ? 401 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
