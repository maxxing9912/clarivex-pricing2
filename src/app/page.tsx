"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import AOS from "aos";
import "aos/dist/aos.css";
import { loadStripe } from "@stripe/stripe-js";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

type PlanType = "free" | "monthly" | "annual" | "lifetime";

export default function PricingPage() {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<PlanType>("free");
  const typewriterRef = useRef<HTMLSpanElement>(null);

  // Check subscription status
  useEffect(() => {
    if (!session?.user?.id) {
      setPlan("free");
      return;
    }
    fetch('/api/premium-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId: session.user.id }),
    })
      .then(res => res.json())
      .then(data => {
        setPlan(data.plan as PlanType || 'free');
      })
      .catch(() => setPlan('free'));
  }, [session]);

  // Typewriter animation
  useEffect(() => {
    AOS.init({ once: true, duration: 1000, easing: 'ease-out-back' });
    const words = [
      'Free, Monthly, Annual & Lifetime.',
      '€3.99 per month subscription.',
      'Lifetime access only €34.99.',
    ];
    let wi = 0, ci = 0, del = false, timeout: NodeJS.Timeout;
    const tick = () => {
      const full = words[wi];
      if (!del) {
        ci++;
        typewriterRef.current!.textContent = full.slice(0, ci);
        if (ci === full.length) {
          del = true;
          timeout = setTimeout(tick, 1500);
          return;
        }
      } else {
        ci--;
        typewriterRef.current!.textContent = full.slice(0, ci);
        if (ci === 0) {
          del = false;
          wi = (wi + 1) % words.length;
        }
      }
      timeout = setTimeout(tick, del ? 50 : 120);
    };
    tick();
    return () => clearTimeout(timeout);
  }, []);

  // Stripe checkout
  const createCheckoutSession = async (selectedPlan: PlanType) => {
    if (!session) return signIn('discord');
    if (plan === selectedPlan) return alert('You already have this plan.');

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: session.user.id, plan: selectedPlan }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const { sessionId } = await res.json();
      const stripe = await loadStripe(stripePublicKey);
      await stripe!.redirectToCheckout({ sessionId });
    } catch (e: any) {
      alert(e.message || 'Something went wrong.');
    }
  };

  return (
    <main className="font-sans bg-gray-100 text-gray-900 min-h-screen flex flex-col">
      {/* NAVBAR */}
      <nav className="bg-indigo-700 text-white p-4">
        <a href="/" className="text-lg font-bold hover:underline">
          Clarivex
        </a>
      </nav>

      {/* HERO */}
      <section className="text-center py-24 bg-gradient-to-b from-indigo-900 to-indigo-950 text-white">
        <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
          <span ref={typewriterRef} className="block h-12" />
        </h2>
        <p className="text-indigo-200 mb-12 text-lg">
          Choose your plan and unlock all Clarivex features.
        </p>
      </section>

      {/* PLANS */}
      <section className="bg-white py-20 flex-1">
        <div className="container mx-auto max-w-5xl grid md:grid-cols-4 gap-8 px-6">
          {/* FREE */}
          <PlanCard
            title="Free"
            priceTop="€0"
            priceBottom="forever"
            features={["Basic Moderation", "Community Events Access", "Community Support"]}
            selected={plan === 'free'}
            onSelect={() => alert('Free plan selected')}
            badge={null}
            buttonLabel="Current Plan"
            disabled
          />

          {/* MONTHLY */}
          <PlanCard
            title="Monthly"
            priceTop="€3.99"
            priceBottom="/month"
            features={["All features unlocked", "Priority Queue for Feature Requests", "Priority Support"]}
            selected={plan === 'monthly'}
            onSelect={() => createCheckoutSession('monthly')}
            badge={{ text: 'Most Popular', color: 'bg-yellow-200 text-yellow-800' }}
            buttonLabel={plan === 'monthly' ? 'Current Plan' : 'Choose Monthly'}
          />

          {/* ANNUAL */}
          <PlanCard
            title="Annual"
            priceTop="€29.99"
            priceBottom="/year"
            subtitle="Save 38% compared to monthly"
            features={["All features unlocked", "Discounts on merchandising", "Priority Support", "More chances to win in a giveaway"]}
            selected={plan === 'annual'}
            onSelect={() => createCheckoutSession('annual')}
            badge={{ text: 'Best Value', color: 'bg-gray-200 text-gray-700' }}
            buttonLabel={plan === 'annual' ? 'Current Plan' : 'Choose Annual'}
          />

          {/* LIFETIME */}
          <PlanCard
            title="Lifetime"
            priceTopLine="€69.99"
            priceTopLineStrikethrough
            priceTop="€34.99"
            priceBottom="once"
            features={["All features unlocked forever", "A new custom command", "Lifetime & Early Access Roles", "All the features of the previous plans"]}
            selected={plan === 'lifetime'}
            onSelect={() => createCheckoutSession('lifetime')}
            badge={{ text: 'Limited Offer', color: 'bg-red-200 text-red-800' }}
            buttonLabel={plan === 'lifetime' ? 'Current Plan' : 'Choose Lifetime'}
          />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#111827] text-[#a5b4fc] py-6 text-center border-t border-[#374151]">
        <p className="text-sm">&copy; 2025 Clarivex. All rights reserved.</p>
      </footer>
    </main>
  );
}

// Reusable PlanCard component
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
  disabled
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
      data-aos="zoom-in"
      className={`bg-white border rounded-xl shadow-md p-6 text-center transition cursor-pointer ${
        selected ? 'ring-2 ring-offset-2 ring-indigo-500' : 'border-gray-200'
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
        <p className={`text-sm text-gray-500 mb-1 ${
          priceTopLineStrikethrough ? 'line-through' : ''
        }`}>{priceTopLine}</p>
      )}
      <p className="text-3xl font-bold mb-1">
        {priceTop}
        {priceBottom && <span className="text-sm">{priceBottom}</span>}
      </p>
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
      <ul className="space-y-1 text-sm mb-6">
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        disabled={disabled}
        className={`w-full py-2 px-4 font-semibold rounded-full transition ${
          disabled
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
