"use client";

import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AuthStatus() {
  const { data: session, status } = useSession();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;
  if (status === "loading") return <p>Loading...</p>;

  if (!session) {
    return (
      <button onClick={() => signIn("discord")}>
        Login with Discord
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Image
        src={session.user.image || "/default-avatar.png"}
        alt={session.user.name || "User avatar"}
        width={32}
        height={32}
        className="rounded-full"
      />
      <span>{session.user.name}</span>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}