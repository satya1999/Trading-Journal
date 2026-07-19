import { createHash, randomBytes } from "crypto";

// Sync tokens authenticate the MT5 EA. The plaintext is shown to the user
// exactly once; only its SHA-256 hex digest is stored.
export function generateSyncToken(): { token: string; hash: string } {
  const token = "tmk_" + randomBytes(24).toString("base64url");
  return { token, hash: hashSyncToken(token) };
}

export function hashSyncToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
