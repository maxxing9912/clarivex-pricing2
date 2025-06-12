// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client, GatewayIntentBits } from "discord.js";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
let discordClient: Client | null = null;

async function getDiscordClient(): Promise<Client> {
  if (discordClient && discordClient.isReady()) return discordClient;

  discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await discordClient.login(process.env.DISCORD_BOT_TOKEN!);
  await new Promise<void>((resolve) => discordClient!.once("ready", () => resolve()));
  return discordClient;
}

async function getRawBody(request: Request): Promise<Buffer> {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
    if (!discordId) {
      return NextResponse.json({ error: "Missing discordId in metadata" }, { status: 400 });
    }
    try {
      const discord = await getDiscordClient();
      const guild = await discord.guilds.fetch(process.env.DISCORD_GUILD_ID!);
      const member = await guild.members.fetch(discordId);
      await member.roles.add(process.env.DISCORD_PREMIUM_ROLE_ID!);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("Discord role assignment error:", msg);
      return NextResponse.json({ error: "Failed to assign Discord role" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
