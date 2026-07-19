"use client";

import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://careful-duck-681.convex.cloud";
export const convex = new ConvexReactClient(CONVEX_URL);

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  plan: string;
}

export function useSession() {
  const [data, setData] = useState<{ user: SessionUser } | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tm_session_token");
    if (!token) {
      setIsPending(false);
      return;
    }

    // Reactively watch user session profile
    const unsubscribe = convex.onQuery(api.auth.me, { token }, (user) => {
      if (user) {
        setData({ user });
      } else {
        localStorage.removeItem("tm_session_token");
        setData(null);
      }
      setIsPending(false);
    });

    return () => unsubscribe();
  }, []);

  return { data, isPending };
}

export const signIn = {
  email: async (args: { email: string; password: string }) => {
    try {
      const result = await convex.action(api.authActions.login, args);
      localStorage.setItem("tm_session_token", result.token);
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || "Sign in failed" } };
    }
  },
};

export const signUp = {
  email: async (args: { name: string; email: string; password: string }) => {
    try {
      const result = await convex.action(api.authActions.register, args);
      localStorage.setItem("tm_session_token", result.token);
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || "Registration failed" } };
    }
  },
};

export async function signOut() {
  const token = localStorage.getItem("tm_session_token");
  if (token) {
    try {
      await convex.mutation(api.auth.logout, { token });
    } catch (err) {
      console.error("Logout error:", err);
    }
  }
  localStorage.removeItem("tm_session_token");
}
