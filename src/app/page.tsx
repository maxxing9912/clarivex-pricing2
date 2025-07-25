"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

type PlanType = "free" | "monthly" | "annual" | "lifetime";

// Definisce l'ordine dei piani
const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  monthly: 1,
  annual: 2,
  lifetime: 3,
};

export default function PricingPage() {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<PlanType>("free");
  const [loaded, setLoaded] = useState(false);
  const typewriterRef = useRef<HTMLSpanElement>(null);

  // 1) Controllo piano utente
  useEffect(() => {
    if (!session?.user?.id) {
      setPlan("free");
      setLoaded(true);
      return;
    }
    fetch("/api/premium-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId: session.user.id }),
    })
      .then((res) => res.json())
      .then((data) => setPlan(data.plan as PlanType))
      .catch(() => setPlan("free"))
      .finally(() => setLoaded(true));
  }, [session]);

  // 2) Typewriter animation senza AOS
  useEffect(() => {
    const el = typewriterRef.current;
    if (!el) return;
    const words = [
      "Free, Monthly, Annual & Lifetime.",
      "€3.99 per month subscription.",
      "Lifetime access only €34.99.",
    ];
    let wi = 0,
      ci = 0,
      deleting = false;
    let timeout: NodeJS.Timeout;

    const frame = () => {
      if (!el) return;
      const full = words[wi];
      if (!deleting) {
        ci++;
        el.textContent = full.slice(0, ci);
        if (ci === full.length) {
          deleting = true;
          timeout = setTimeout(frame, 1500);
          return;
        }
      } else {
        ci--;
        el.textContent = full.slice(0, ci);
        if (ci === 0) {
          deleting = false;
          wi = (wi + 1) % words.length;
        }
      }
      timeout = setTimeout(frame, deleting ? 50 : 120);
    };

    frame();
    return () => clearTimeout(timeout);
  }, []);

  // 3) Checkout Stripe
  const createCheckoutSession = async (selectedPlan: PlanType) => {
    if (!session) return signIn("discord");
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId: session.user.id, plan: selectedPlan }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const { sessionId } = await res.json();
      const stripe = await loadStripe(stripePublicKey);
      await stripe!.redirectToCheckout({ sessionId });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  // 4) Placeholder di caricamento
  if (!loaded) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-100">
        <p>Caricamento piano in corso…</p>
      </main>
    );
  }

  // rank del piano corrente
  const currentRank = PLAN_RANK[plan];

  // configurazione piani
  const plans: Array<{
    key: PlanType;
    title: string;
    priceTop: string;
    priceBottom?: string;
    priceTopLine?: string;
    priceTopLineStrikethrough?: boolean;
    subtitle?: string;
    features: string[];
    badge?: { text: string; color: string };
  }> = [
    {
      key: "free",
      title: "Free",
      priceTop: "€0",
      priceBottom: "forever",
      features: ["Basic Moderation", "Community Events Access", "Community Support"],
    },
    {
      key: "monthly",
      title: "Monthly",
      priceTop: "€3.99",
      priceBottom: "/month",
      features: ["All features unlocked", "Priority Queue for Feature Requests", "Priority Support"],
      badge: { text: "Most Popular", color: "bg-yellow-200 text-yellow-800" },
    },
    {
      key: "annual",
      title: "Annual",
      priceTop: "€29.99",
      priceBottom: "/year",
      subtitle: "Save 38% compared to monthly",
      features: ["All features unlocked", "Discounts on merchandising", "Priority Support", "More chances to win in a giveaway"],
      badge: { text: "Best Value", color: "bg-gray-200 text-gray-700" },
    },
    {
      key: "lifetime",
      title: "Lifetime",
      priceTopLine: "€69.99",
      priceTopLineStrikethrough: true,
      priceTop: "€34.99",
      priceBottom: "once",
      features: ["All features unlocked forever", "A new custom command", "Lifetime & Early Access Roles", "All the features of the previous plans"],
      badge: { text: "Limited Offer", color: "bg-red-200 text-red-800" },
    },
  ];

  return (
    <main className="font-sans bg-gray-100 text-gray-900 min-h-screen flex flex-col">
      {/* NAVBAR */}
      <nav className="bg-indigo-700 text-white p-4">
        <Link href="/" className="text-lg font-bold hover:underline">
          Clarivex
        </Link>
      </nav>

      {/* HERO */}
      <section className="text-center py-24 bg-gradient-to-b from-indigo-900 to-indigo-950 text-white">
        <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
          <span ref={typewriterRef} className="block h-12"></span>
        </h2>
        <p className="text-indigo-200 mb-12 text-lg">
          Choose your plan and unlock all Clarivex features.
        </p>
      </section>

      {/* PLANS */}
      <section className="bg-white py-20 flex-1">
        <div className="container mx-auto max-w-5xl grid md:grid-cols-4 gap-8 px-6">
          {plans.map((p) => {
            const rank = PLAN_RANK[p.key];
            const isCurrent = p.key === plan;
            const disabled = rank <= currentRank && !isCurrent;
            let buttonLabel: string;
            if (isCurrent) buttonLabel = "Current Plan";
            else if (rank > currentRank) buttonLabel = `Choose ${p.title}`;
            else buttonLabel = "";

            return (
              <PlanCard
                key={p.key}
                title={p.title}
                priceTop={p.priceTop}
                priceBottom={p.priceBottom}
                priceTopLine={p.priceTopLine}
                priceTopLineStrikethrough={p.priceTopLineStrikethrough}
                subtitle={p.subtitle}
                features={p.features}
                selected={isCurrent}
                onSelect={() => createCheckoutSession(p.key)}
                badge={p.badge ?? null}
                buttonLabel={buttonLabel}
                disabled={disabled}
              />
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#111827] text-[#a5b4fc] py-6 text-center border-t border-[#374151]">
        <p className="text-sm">&copy; 2025 Clarivex. All rights reserved.</p>
      </footer>
    </main>
  );
}

function PlanCard({
  title,
  priceTop,
  priceBottom,
  priceTopLine,
  priceTopLineStrikethrough,
  subtitle,
  features,
  selected,
  onSelect,
  badge,
  buttonLabel,
  disabled,
}: {
  title: string;
  priceTop: string;
  priceBottom?: string;
  priceTopLine?: string;
  priceTopLineStrikethrough?: boolean;
  subtitle?: string;
  features: string[];
  selected: boolean;
  onSelect: () => void;
  badge: { text: string; color: string } | null;
  buttonLabel: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-xl shadow-md p-6 text-center transition cursor-pointer ${
        selected ? "ring-2 ring-offset-2 ring-indigo-500" : "border-gray-200"
      }`}
      onClick={() => !disabled && onSelect()}
    >
      {badge && (
        <div className={`inline-block px-3 py-1 rounded-full text-xs mb-2 ${badge.color}`}>
          {badge.text}
        </div>
      )}
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      {priceTopLine && (
        <p className={`text-sm text-gray-500 mb-1 ${priceTopLineStrikethrough ? "line-through" : ""}`}>{priceTopLine}</p>
      )}
      <p className="text-3xl font-bold mb-1">
        {priceTop}
        {priceBottom && <span className="text-sm">{priceBottom}</span>}
      </p>
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
      <ul className="space-y-1 text-sm mb-6">{features.map((f, i) => (<li key={i}>{f}</li>))}</ul>
      <button
        onClick={onSelect}
        disabled={disabled}
        className={`w-full py-2 px-4 font-semibold rounded-full transition ${
          disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
