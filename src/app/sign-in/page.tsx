import type { Metadata } from "next";
import SignInClient from "@/components/auth/sign-in-client";
import { store } from "@/lib/repo/in-memory";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function SignInPage() {
  const db = store.db;

  return (
    <SignInClient
      members={db.memberships.map((m) => ({
        user: store.getUser(m.userId)!,
        role: m.role,
      }))}
    />
  );
}
