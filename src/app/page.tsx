"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import AOS from "aos";
import "aos/dist/aos.css";
import { loadStripe } from "@stripe/stripe-js";

const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

export default function PricingPage() {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const typewriterRef = useRef<HTMLSpanElement>(null);

  // On login, query your API for true premium status
  useEffect(() => {
    if (!session?.user?.id) {
      setPlan("free");
      return;
    }

    fetch("/api/premium-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId: session.user.id }),
    })
      .then(res => res.json())
      .then(data => {
        setPlan(data.hasPremium ? "premium" : "free");
        if (data.hasPremium) localStorage.setItem("clarivexPlan", "premium");
      })
      .catch(() => {
        setPlan("free");
        localStorage.removeItem("clarivexPlan");
      });
  }, [session]);

  // Save to localStorage only after confirmation from server
  useEffect(() => {
    if (plan === "free") localStorage.removeItem("clarivexPlan");
  }, [plan]);

  // Typewriter animation
  useEffect(() => {
    AOS.init({ once: true, duration: 1000, easing: "ease-out-back" });
    const words = [
      "Free & Premium Plans.",
      "One-time Premium $3.99.",
      "Lifetime Access to Clarivex.",
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
        if (!ci) {
          del = false;
          wi = (wi + 1) % words.length;
        }
      }
      timeout = setTimeout(tick, del ? 50 : 120);
    };
    tick();
    return () => clearTimeout(timeout);
  }, []);

  // Fire Stripe checkout
  const createCheckoutSession = async () => {
    if (!session) {
      return signIn("discord");
    }
    if (plan === "premium") {
      return alert("You already own Premium.");
    }
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId: session.user.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create session");
      }
      const { sessionId } = await res.json();
      const stripe = await loadStripe(stripePublicKey);
      const result = await stripe!.redirectToCheckout({ sessionId });
      if (result?.error) throw new Error(result.error.message);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      alert(msg);
    }
  };

  return (
    <main className="font-sans bg-gray-100 text-gray-900 min-h-screen flex flex-col">
      {/* NAVBAR */}
      <nav className="bg-indigo-700 text-white p-4">
        <a
          href="https://clarivex50.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-bold hover:underline"
        >
          Home
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
        <div className="container mx-auto max-w-4xl grid md:grid-cols-2 gap-8 px-6">
          {/* FREE PLAN */}
          <div
            data-aos="zoom-in"
            className={`bg-white border rounded-xl shadow-md p-8 hover:shadow-lg transition cursor-pointer ${
              plan === "free" ? "border-indigo-500" : "border-gray-200"
            }`}
          >
            <h3 className="text-2xl font-bold mb-2">Free</h3>
            <p className="text-xl text-gray-500 mb-4">Forever Free</p>
            <ul className="mb-6 space-y-2 text-left list-disc list-inside text-sm">
              <li>Basic Moderation</li>
              <li>Limited XP & Levels</li>
              <li>Community Support</li>
            </ul>
            <button
              className="w-full py-2 px-4 font-semibold rounded-full border bg-white text-gray-900 hover:bg-gray-100 transition"
              disabled={!session || plan === "premium"}
              onClick={() => {
                if (!session) signIn("discord");
              }}
            >
              {!session
                ? "Login to select"
                : plan === "free"
                ? "Current Plan"
                : "Select Free"}
            </button>
          </div>

          {/* PREMIUM PLAN */}
          <div
            data-aos="zoom-in"
            data-aos-delay="200"
            className={`bg-indigo-600 text-white border rounded-xl shadow-md p-8 hover:shadow-lg transition cursor-pointer ${
              plan === "premium"
                ? "ring-2 ring-offset-2 ring-white"
                : "border-transparent"
            }`}
          >
            <h3 className="text-2xl font-bold mb-2">Premium</h3>
            <p className="text-3xl font-bold mb-1">$3.99</p>
            <p className="text-sm mb-4 text-indigo-200">
              One-time payment • Lifetime Access
            </p>
            <ul className="mb-6 space-y-2 text-left list-disc list-inside text-sm">
              <li>Advanced Moderation</li>
              <li>Full XP & Levels</li>
              <li>Premium Unlocks</li>
              <li>Priority Support</li>
            </ul>
            <button
              onClick={createCheckoutSession}
              className="w-full py-2 px-4 font-semibold rounded-full bg-white text-indigo-600 hover:bg-gray-100 transition"
              disabled={plan === "premium"}
            >
              {plan === "premium" ? "Current Plan" : "Buy Premium"}
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#111827] text-[#a5b4fc] py-6 text-center border-t border-[#374151]">
        <p className="text-sm">&copy; 2025 Clarivex. All rights reserved.</p>
      </footer>
    </main>
  );
}
