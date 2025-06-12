// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma"; // se usi Prisma, altrimenti sostituisci con la tua logica DB

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Assegna ruolo Discord via REST API
async function assignDiscordRole(discordId: string) {
  const guildId = process.env.DISCORD_GUILD_ID!;
  const roleId = process.env.DISCORD_PREMIUM_ROLE_ID!;
  const token = process.env.DISCORD_BOT_TOKEN!;
  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${roleId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }
}

// Salva/aggiorna utente premium su DB esterno
async function markPremiumInDatabase(discordId: string) {
  await prisma.premiumUser.upsert({
    where: { discordId },
    update: { isPremium: true },
    create: { discordId, isPremium: true },
  });
}

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const buf = await request.arrayBuffer();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(Buffer.from(buf), sig, webhookSecret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Webhook signature failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const discordId = session.metadata?.discordId;
    if (discordId) {
      try {
        await assignDiscordRole(discordId);
      } catch (e: unknown) {
        console.error("Errore assegnazione ruolo Discord:", (e as Error).message);
        // opzionale: return NextResponse.json({}, { status: 500 }) per retry automatico
      }
      try {
        await markPremiumInDatabase(discordId);
      } catch (e: unknown) {
        console.error("Errore scrittura DB premium:", (e as Error).message);
      }
    } else {
      console.warn("checkout.session.completed senza metadata.discordId");
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
