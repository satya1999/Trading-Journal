// Copies the canonical EA source (ea/TradeMindSync.mq5) into public/ so the
// connect wizard can serve a personalized download. Runs before dev/build —
// never edit public/TradeMindSync.mq5 directly.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(webRoot, "..", "..", "ea", "TradeMindSync.mq5");
const dest = join(webRoot, "public", "TradeMindSync.mq5");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("copied EA template -> public/TradeMindSync.mq5");
