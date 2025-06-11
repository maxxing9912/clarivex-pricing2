import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export async function POST(request: Request) {
  const { discordId } = await request.json();

  if (!discordId) {
    return new Response(JSON.stringify({ error: "Missing discordId" }), { status: 400 });
  }

  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Premium Lifetime Access",
            },
            unit_amount: 399, // €3.99 in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        discordId,
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to create session" }), { status: 500 });
  }
}