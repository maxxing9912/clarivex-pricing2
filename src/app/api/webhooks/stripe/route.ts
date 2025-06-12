// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Client, GatewayIntentBits } from "discord.js";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
let discordClient: Client | null = null;

async function getDiscordClient(): Promise<Client> {
  if (discordClient && discordClient.isReady()) {
    return discordClient;
  }
  discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });
  await discordClient.login(process.env.DISCORD_BOT_TOKEN!);
  await new Promise<void>((resolve) =>
    discordClient!.once("ready", () => resolve())
  );
  return discordClient;
}

async function getRawBody(request: Request): Promise<Buffer> {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: Request) {
  // Inizio POST {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const buf = await getRawBody(request);
    event = stripe.webhooks.constructEvent(buf, signature, webhookSecret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook Error: ${msg}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    // Inizio if event.type {
    const session = event.data.object as Stripe.Checkout.Session;
    const discordId = session.metadata?.discordId;
    if (!discordId) {
      console.warn("checkout.session.completed senza metadata.discordId");
      // Se vuoi bloccare qui, usa return; altrimenti continua.
    } else {
      // Inizio else {
      try {
        const discord = await getDiscordClient();
        const guild = await discord.guilds.fetch(
          process.env.DISCORD_GUILD_ID!
        );
        const member = await guild.members.fetch(discordId);
        await member.roles.add(process.env.DISCORD_PREMIUM_ROLE_ID!);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("Discord role assignment error:", msg);
        // Se vuoi forzare retry da Stripe, fai return con status 500 qui.
      }
      // Fine else }
    }
    // Fine if event.type }
  }

  // Se hai altri event.type, aggiungi qui

  return NextResponse.json({ received: true }, { status: 200 });
  // Fine POST }
}
// Fine file
