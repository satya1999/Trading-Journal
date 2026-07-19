"use client";

import clsx from "clsx";
import {
  BarChart3,
  Cable,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/ui";
import { signOut, useSession } from "@/lib/auth-client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trade journal", icon: NotebookPen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/accounts", label: "MT5 accounts", icon: Cable },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner />
      </main>
    );
  }

  const initial = (session.user.name || session.user.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-white/[0.03] backdrop-blur-2xl">
        <div className="px-5 pt-5 pb-4">
          <Link href="/dashboard">
            <Logo size="sm" />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/12 text-ink"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                  />
                )}
                <item.icon
                  className={clsx(
                    "size-4",
                    active ? "text-accent" : "text-muted group-hover:text-ink-2",
                  )}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 border-t px-4 py-4">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-ink-2"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-muted">{session.user.email}</p>
          </div>
          <button
            aria-label="Sign out"
            title="Sign out"
            className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-6 lg:px-10">{children}</main>
    </div>
  );
}
