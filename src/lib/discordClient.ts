// lib/discordClient.ts
import { Client, GatewayIntentBits } from "discord.js";

const discord = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

if (!discord.isReady()) {
  discord.login(process.env.DISCORD_BOT_TOKEN);
}

export default discord;