import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  return session ? (
    <>
      <p>Benvenuto, {session.user.name}</p>
      <button onClick={() => signOut()}>Logout</button>
    </>
  ) : (
    <button onClick={() => signIn("discord")}>Accedi con Discord</button>
  );
}