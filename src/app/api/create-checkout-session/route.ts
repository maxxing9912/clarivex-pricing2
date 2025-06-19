// src/app/api/create-checkout-session/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

const PLAN_CONFIG = {
  monthly: {
    mode: "subscription" as const,
    price_data: {
      currency: "eur",
      unit_amount: 399, // €3.99
      recurring: { interval: "month" },
      product_data: { name: "Clarivex Monthly Subscription" },
    },
  },
  annual: {
    mode: "subscription" as const,
    price_data: {
      currency: "eur",
      unit_amount: 2999, // €29.99
      recurring: { interval: "year" },
      product_data: { name: "Clarivex Annual Subscription" },
    },
  },
  lifetime: {
    mode: "payment" as const,
    price_data: {
      currency: "eur",
      unit_amount: 3499, // €34.99
      product_data: { name: "Clarivex Lifetime Access" },
    },
  },
};

type PlanKey = keyof typeof PLAN_CONFIG;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    discordId?: string;
    plan?: PlanKey;
  };
  const { discordId, plan } = body;

  if (!discordId || !plan || !(plan in PLAN_CONFIG)) {
    return NextResponse.json(
      { error: "Missing or invalid discordId or plan" },
      { status: 400 }
    );
  }

  const origin = process.env.NEXTAUTH_URL ?? "https://clarivex-pricing2-61a4qeaad-maxxing9912s-projects.vercel.app/";

  try {
    // plan is now keyof PLAN_CONFIG
    const config = PLAN_CONFIG[plan];
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        mode: config.mode,
        line_items: [
          {
            price_data: config.price_data,
            quantity: 1,
          },
        ],
        metadata: { discordId, plan },
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
        cancel_url: `${origin}/pricing`,
      } as Stripe.Checkout.SessionCreateParams
    );

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
