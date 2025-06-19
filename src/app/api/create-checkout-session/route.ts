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

export async function POST(request: Request) {
  const { discordId, plan } = (await request.json()) as {
    discordId?: string;
    plan?: keyof typeof PLAN_CONFIG;
  };

  if (!discordId || !(plan in PLAN_CONFIG)) {
    return NextResponse.json(
      { error: "Missing or invalid discordId or plan" },
      { status: 400 }
    );
  }

  const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const { mode, price_data } = PLAN_CONFIG[plan];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode,
      line_items: [
        {
          price_data,
          quantity: 1,
        },
      ],
      metadata: { discordId, plan },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${origin}/pricing`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
