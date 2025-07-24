// pages/api/premium-status.ts

import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const ROLE_PLAN_MAP = {
  [process.env.DISCORD_LIFETIME_ROLE_ID!]: "lifetime",
  [process.env.DISCORD_MONTHLY_ROLE_ID!]: "monthly",
  [process.env.DISCORD_ANNUAL_ROLE_ID!]: "annual",
};

let loggedIn = false;

async function getClient() {
  if (!loggedIn) {
    await client.login(process.env.DISCORD_BOT_TOKEN!);
    loggedIn = true;
  }
  return client;
}

export async function POST(req: Request) {
  const { discordId } = await req.json();
  if (!discordId) {
    return new Response("Missing discordId", { status: 400 });
  }

  try {
    const discord = await getClient();
    const guild = await discord.guilds.fetch(process.env.DISCORD_GUILD_ID!);
    const member = await guild.members.fetch(discordId);

    const userRoles = member.roles.cache;
    for (const [roleId, plan] of Object.entries(ROLE_PLAN_MAP)) {
      if (userRoles.has(roleId)) {
        return new Response(JSON.stringify({ plan }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ plan: "free" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Error fetching Discord roles:", e);
    return new Response("Internal error", { status: 500 });
  }
}
