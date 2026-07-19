"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
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

    const account = await ctx.runMutation(api.accounts.insertAccount, {
      token: args.token,
      label: args.label,
      syncTokenHash,
    });

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

    await ctx.runMutation(api.accounts.updateTokenHash, {
      token: args.token,
      id: args.id,
      syncTokenHash,
    });

    return { syncToken };
  },
});
