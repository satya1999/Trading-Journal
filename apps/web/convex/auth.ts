import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export async function getSessionUser(ctx: any, token: string | undefined) {
  if (!token) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }
  return await ctx.db.get(session.userId);
}

export const me = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan,
    };
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const registerUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if email exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) {
      throw new Error("Email already registered");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      plan: "free",
    });

    await ctx.db.insert("sessions", {
      userId,
      token: args.token,
      expiresAt: args.expiresAt,
    });

    return { token: args.token, user: { id: userId, name: args.name, email: args.email } };
  },
});

export const createSession = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sessions", {
      userId: args.userId,
      token: args.token,
      expiresAt: args.expiresAt,
    });
    return { token: args.token };
  },
});

export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (session) {
      await ctx.db.delete(session._id);
    }
    return { success: true };
  },
});
