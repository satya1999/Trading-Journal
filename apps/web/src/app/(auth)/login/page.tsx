"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button, Card, Input } from "@/components/ui";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn.email({ email, password });
    setBusy(false);
    if (error) setError(error.message ?? "Sign in failed");
    else router.push("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-accent/12 blur-[110px]"
      />
      <div className="anim-fade-up w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>
        <Card className="p-6">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="mt-1 mb-5 text-sm text-ink-2">
            Sign in to your trading journal.
          </p>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-bad">{error}</p>}
            <Button type="submit" disabled={busy} className="mt-1">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-2">
          No account?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </main>
  );
}
