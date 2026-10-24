"use client";

import { AuthContext } from "./authTypes";
import { normalizeAppPathname } from "@client/lib/normalizeAppPathname";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { ReactNode, useContext, useEffect, useState } from "react";

/** Routes where a full-screen blocking overlay would trap clicks (e.g. `/?utm=…` home). */
function isSessionBootstrapNonBlocking(pathname: string): boolean {
  if (pathname === "/" || pathname === "/ui") {
    return true;
  }
  // Public vanity routes must render without waiting on Supabase session restore.
  if (pathname.startsWith("/@")) {
    return true;
  }
  return pathname.startsWith("/auth/");
}

/**
 * Whether this page load is the return from a sign-in. OAuth uses PKCE, so Supabase sends the
 * browser back with `?code=`. Read after mount: the static HTML has no query string, and
 * reading it during render would make the server and client markup differ.
 */
function useReturningFromSignIn(): boolean {
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    setReturning(new URLSearchParams(window.location.search).has("code"));
  }, []);
  return returning;
}

/**
 * Until Supabase emits `INITIAL_SESSION`, either block with a full-screen gate (protected
 * routes) or render the page as is (marketing / public / login) so links and buttons stay usable.
 * "Signing you in…" only appears when returning from a sign-in. Restoring an existing session,
 * or finding none (guests), is silent on public pages and a plain loader on protected ones.
 */
export function AuthBootstrapShell({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const pathname = normalizeAppPathname(usePathname());
  const signingIn = useReturningFromSignIn();

  if (!auth) {
    throw new Error("AuthBootstrapShell must be used inside AuthProvider");
  }

  const { loading, configError } = auth;

  const bootstrapping = loading && !configError;

  if (!bootstrapping || isSessionBootstrapNonBlocking(pathname)) {
    // Keep `children` in the same slot whether or not the banner shows: changing the sibling
    // count shifts every `useId` below (hydration attribute mismatch) and remounts the page.
    return (
      <>
        {bootstrapping && signingIn ? (
          <div
            className="bg-primary/15 text-foreground pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b py-2 text-xs shadow-sm backdrop-blur-sm"
            aria-busy="true"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
            <span>Signing you in…</span>
          </div>
        ) : null}
        {children}
      </>
    );
  }

  return (
    <div
      className="bg-background text-muted-foreground fixed inset-0 z-50 flex flex-col items-center justify-center gap-3"
      aria-busy="true"
      role="status"
    >
      <Loader2 className="text-foreground size-10 animate-spin" aria-hidden />
      <p className="text-foreground text-sm font-medium">
        {signingIn ? "Signing you in…" : "Loading…"}
      </p>
    </div>
  );
}
