"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { createHash, randomBytes } from "crypto";

function generateSyncToken(): { token: string; hash: string } {
  const token = "tmk_" + randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export const create = action({
  args: {
    token: v.string(),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const { token: syncToken, hash: syncTokenHash } = generateSyncToken();

    // Cast string path as any to bypass circular TypeScript reference compilation checks
    const account = await ctx.runMutation("accounts:insertAccount" as any, {
      token: args.token,
      label: args.label,
      syncTokenHash,
    }) as any;

    return {
      account,
      label: account.label,
      syncToken,
    };
  },
});

export const rotateToken = action({
  args: {
    token: v.string(),
    id: v.id("tradingAccounts"),
  },
  handler: async (ctx, args) => {
    const { token: syncToken, hash: syncTokenHash } = generateSyncToken();

    // Cast string path as any to bypass circular TypeScript reference compilation checks
    await ctx.runMutation("accounts:updateTokenHash" as any, {
      token: args.token,
      id: args.id,
      syncTokenHash,
    });

    return { syncToken };
  },
});
