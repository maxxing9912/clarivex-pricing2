import fs from "fs/promises";
import path from "path";

const PREMIUM_DB_PATH = path.resolve("./premiumUsers.json");

async function readPremiumUsers(): Promise<Record<string, boolean>> {
  try {
    const data = await fs.readFile(PREMIUM_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const { discordId } = await req.json();

  if (!discordId) {
    return new Response(JSON.stringify({ error: "Missing discordId" }), { status: 400 });
  }

  const premiumUsers = await readPremiumUsers();
  const hasPremium = !!premiumUsers[discordId];

  return new Response(JSON.stringify({ hasPremium }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}