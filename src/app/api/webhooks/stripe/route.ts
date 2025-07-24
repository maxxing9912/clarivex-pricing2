import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs/promises";
import path from "path";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const PREMIUM_DB_PATH = path.resolve("./premiumUsers.json");
let discordClient: Client | null = null;

async function getDiscordClient(): Promise<Client> {
  if (discordClient && discordClient.isReady()) return discordClient;
  discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await discordClient.login(process.env.DISCORD_BOT_TOKEN!);
  await new Promise<void>(resolve => discordClient!.once("ready", () => resolve()));
  return discordClient;
}

async function getRawBody(request: Request): Promise<Buffer> {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function updatePremiumDB(discordId: string, plan: string) {
  let db: Record<string, string>;
  try {
    const text = await fs.readFile(PREMIUM_DB_PATH, "utf-8");
    db = JSON.parse(text);
  } catch {
    db = {};
  }
  db[discordId] = plan;
  await fs.writeFile(PREMIUM_DB_PATH, JSON.stringify(db, null, 2));
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe signature" }, { status: 400 });

  const buf = await getRawBody(request);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, signature, webhookSecret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const discordId = session.metadata?.discordId;
    const plan = session.metadata?.plan; // => "monthly", "annual", etc.
    if (!discordId || !plan) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // 1) aggiorno il DB
    await updatePremiumDB(discordId, plan);

    // 2) aggiorno i ruoli Discord
    try {
      const discord = await getDiscordClient();
      const guild = await discord.guilds.fetch(process.env.DISCORD_GUILD_ID!);
      const member = await guild.members.fetch(discordId);

      // rimuovo eventuali ruoli precedenti
      const allRoles = ["free", "monthly", "annual", "lifetime"];
      for (const p of allRoles) {
        if (p !== plan) {
          const rid = process.env[`DISCORD_${p.toUpperCase()}_ROLE_ID`];
          if (rid) await member.roles.remove(rid);
        }
      }
      // assegno il nuovo ruolo
      const newRoleId = process.env[`DISCORD_${plan.toUpperCase()}_ROLE_ID`];
      if (newRoleId) {
        await member.roles.add(newRoleId);
      }
    } catch (e: unknown) {
      console.error("Discord role assignment error:", e);
      return NextResponse.json({ error: "Failed to assign Discord role" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
