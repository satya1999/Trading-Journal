import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "../env";
import { prisma } from "../prisma/prisma.service";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.authSecret,
  baseURL: env.authUrl,
  trustedOrigins: [env.webUrl],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:
    env.googleClientId && env.googleClientSecret
      ? {
          google: {
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
          },
        }
      : {},
  user: {
    additionalFields: {
      plan: { type: "string", defaultValue: "free", input: false },
    },
  },
});

export type SessionUser = typeof auth.$Infer.Session.user;
