"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { pbkdf2Sync, randomBytes } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const testHash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === testHash;
}

export const register = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const passwordHash = hashPassword(args.password);
    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    return await ctx.runMutation(api.auth.registerUser, {
      name: args.name,
      email: args.email,
      passwordHash,
      token,
      expiresAt,
    });
  },
});

export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.auth.getUserByEmail, { email: args.email });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!verifyPassword(args.password, user.passwordHash)) {
      throw new Error("Invalid email or password");
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.runMutation(api.auth.createSession, {
      userId: user._id,
      token,
      expiresAt,
    });

    return { token, user: { id: user._id, name: user.name, email: user.email } };
  },
});
