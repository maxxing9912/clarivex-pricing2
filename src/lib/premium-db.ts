import fs from "fs/promises";
import path from "path";

const PREMIUM_DB_PATH = path.resolve(process.cwd(), "premiumUsers.json");

/**
 * Restituisce la mappa { discordId: true } creata dal webhook Stripe
 */
export async function readPremiumUsers(): Promise<Record<string, boolean>> {
  try {
    const data = await fs.readFile(PREMIUM_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Registra l'user come premium (usato dal webhook)
 */
export async function writePremiumUsers(data: Record<string, boolean>) {
  await fs.writeFile(
    PREMIUM_DB_PATH,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}
