import { config } from "dotenv";
import { resolve } from "path";

// Load the repo-root .env first (monorepo convention), then any local one.
config({ path: resolve(process.cwd(), "../../.env") });
config();

export const env = {
  port: Number(process.env.API_PORT ?? 4000),
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  authSecret: process.env.BETTER_AUTH_SECRET ?? "dev-only-insecure-secret",
  authUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  googleClientId: process.env.GOOGLE_CLIENT_ID || undefined,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || undefined,
};
