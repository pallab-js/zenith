import { cookies, headers } from "next/headers";
import { store } from "@/lib/repo";
import { SESSION_COOKIE, resolveSession, type Session } from "@/lib/session";

/**
 * Next.js binding for `lib/session.ts` — the only module that touches the
 * cookie jar. Readable in Server Components and Server Functions; setting
 * requires a Server Function (a server action), per the Next.js docs.
 */

export async function getSession(): Promise<Session> {
  const jar = await cookies();
  return resolveSession(
    jar.get(SESSION_COOKIE)?.value,
    store.getUsers(),
    store.getMemberships(),
  );
}

export async function setSessionUser(userId: string): Promise<void> {
  const jar = await cookies();
  const proto = (await headers()).get("x-forwarded-proto");

  jar.set(SESSION_COOKIE, userId, {
    httpOnly: true, // never readable from JS
    sameSite: "lax", // no cross-site sends
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    // Only mark Secure when the request actually arrived over TLS — `next
    // start` on plain http would otherwise silently drop the cookie.
    secure: proto === "https",
  });
}
