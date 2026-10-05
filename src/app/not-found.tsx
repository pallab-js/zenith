import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="brand-mesh flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-eyebrow">404</p>
      <h1 className="mt-3 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
        LOST IN
        <br />
        ORBIT.
      </h1>
      <p className="mt-4 max-w-md text-[15px] text-ink-70">
        That page doesn&apos;t exist — it may have been renamed, deleted, or you
        followed a stale link.
      </p>
      <Link href="/" className="mt-7">
        <Button variant="green">Back to dashboard</Button>
      </Link>
    </div>
  );
}
