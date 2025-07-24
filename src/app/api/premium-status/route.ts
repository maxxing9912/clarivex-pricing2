import { Client, GatewayIntentBits } from "discord.js";
import { readPremiumUsers } from "@/lib/premium-db";
import { once } from "events";

const ROLE_PLAN_MAP: Record<string, "lifetime" | "monthly" | "annual"> = {
  [process.env.DISCORD_LIFETIME_ROLE_ID!]: "lifetime",
  [process.env.DISCORD_MONTHLY_ROLE_ID!]: "monthly",
  [process.env.DISCORD_ANNUAL_ROLE_ID!]: "annual",
};

let client: Client | null = null;
async function getClient(): Promise<Client> {
  if (client && client.isReady()) return client;
  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });
  await client.login(process.env.DISCORD_BOT_TOKEN!);
  if (!client.isReady()) {
    await once(client, "ready");
  }
  return client;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { discordId } = await req.json();
    if (!discordId) {
      return new Response("Missing discordId", { status: 400 });
    }

    // 1) Controllo JSON Stripe-webhook
    const premiumUsers = await readPremiumUsers();
    if (premiumUsers[discordId]) {
      console.log(`User ${discordId} trovato in premiumUsers.json → lifetime`);
      return new Response(JSON.stringify({ plan: "lifetime" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2) Altrimenti, fetch ruoli Discord
    const discord = await getClient();
    const guild = await discord.guilds.fetch(process.env.DISCORD_GUILD_ID!);
    const member = await guild.members.fetch(discordId);

    for (const [roleId, plan] of Object.entries(ROLE_PLAN_MAP)) {
      if (member.roles.cache.has(roleId)) {
        console.log(`User ${discordId} ha ruolo ${plan}`);
        return new Response(JSON.stringify({ plan }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 3) Default free
    console.log(`User ${discordId} nessun ruolo → free`);
    return new Response(JSON.stringify({ plan: "free" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Errore in premium-status:", e);
    return new Response("Internal server error", { status: 500 });
  }
}
