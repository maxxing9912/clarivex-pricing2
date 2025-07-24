import fs from "fs/promises";
import path from "path";

const PREMIUM_DB_PATH = path.resolve("./premiumUsers.json");

async function readPremiumUsers(): Promise<Record<string, string>> {
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
    return new Response("Missing discordId", { status: 400 });
  }

  const premiumUsers = await readPremiumUsers();
  const plan = (premiumUsers[discordId] as "free"|"monthly"|"annual"|"lifetime") || "free";

  return new Response(JSON.stringify({ plan }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
