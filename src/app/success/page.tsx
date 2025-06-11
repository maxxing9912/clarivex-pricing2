"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Set localStorage plan to premium on success
    localStorage.setItem("clarivexPlan", "premium");

    // Dopo 5 secondi torna alla home (o a /pricing se vuoi)
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-4">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        Payment completed successfully!
      </h1>
      <p>Thank you for purchasing Premium. You now have access to all features.</p>
      <p className="mt-4 text-gray-700">You will be automatically redirected to the home page...</p>
    </main>
  );
}