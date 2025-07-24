// src/app/api/stripe-webhook.ts
import Stripe from 'stripe';
import fs from 'fs/promises';
import path from 'path';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const PREMIUM_DB_PATH = path.resolve('./premiumUsers.json');

// ✅ Typing corretto
type PremiumUserData = {
  plan: 'monthly' | 'annual' | 'lifetime';
  expiresAt: string | null;
};
type PremiumUserMap = Record<string, PremiumUserData>;

async function readPremiumUsers(): Promise<PremiumUserMap> {
  try {
    const data = await fs.readFile(PREMIUM_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writePremiumUsers(data: PremiumUserMap) {
  await fs.writeFile(PREMIUM_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function getRawBody(req: Request): Promise<Buffer> {
  const arrayBuffer = await req.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: Request): Promise<Response> {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  const buf = await getRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const discordId = session.metadata?.discordId;
    const plan = session.metadata?.plan as PremiumUserData['plan'];

    if (discordId && plan) {
      const users = await readPremiumUsers();

      let expiresAt: string | null = null;
      const now = Date.now();

      if (plan === 'monthly') {
        expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (plan === 'annual') {
        expiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
      }

      users[discordId] = {
        plan,
        expiresAt,
      };

      await writePremiumUsers(users);
      console.log(`[STRIPE] Premium attivato per ${discordId} (${plan})`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
