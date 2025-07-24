import { Client, GatewayIntentBits } from "discord.js";

const ROLE_PLAN_MAP = {
  [process.env.DISCORD_LIFETIME_ROLE_ID!]: "lifetime",
  [process.env.DISCORD_MONTHLY_ROLE_ID!]: "monthly",
  [process.env.DISCORD_ANNUAL_ROLE_ID!]: "annual",
};

let client: Client | null = null;

async function getClient() {
  if (client && client.isReady()) return client;

  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  await client.login(process.env.DISCORD_BOT_TOKEN!);

  return client;
}

export async function POST(req: Request) {
  try {
    const { discordId } = await req.json();

    if (!discordId) {
      return new Response("Missing discordId", { status: 400 });
    }

    const discord = await getClient();

    const guild = await discord.guilds.fetch(process.env.DISCORD_GUILD_ID!);
    const member = await guild.members.fetch(discordId);

    for (const [roleId, plan] of Object.entries(ROLE_PLAN_MAP)) {
      if (!roleId) continue; // in case env is missing

      if (member.roles.cache.has(roleId)) {
        return new Response(JSON.stringify({ plan }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Nessun ruolo premium trovato, free di default
    return new Response(JSON.stringify({ plan: "free" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Error fetching Discord roles:", e);
    return new Response("Internal server error", { status: 500 });
  }
}
