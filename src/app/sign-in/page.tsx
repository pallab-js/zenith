import type { Metadata } from "next";
import SignInClient from "@/components/auth/sign-in-client";
import { store } from "@/lib/repo";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <SignInClient members={store.getMembers()} />;
}
