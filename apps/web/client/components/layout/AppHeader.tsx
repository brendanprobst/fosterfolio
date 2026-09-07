"use client";

import { useAuth } from "@client/auth";
import { Button, buttonVariants } from "@client/components/ui/button";
import { cn } from "@client/lib/utils";
import Link from "next/link";

type AppHeaderProps = {
  /** Highlight the active primary nav item. */
  active?: "home" | "profile" | "search";
};

/**
 * Shared top nav for product surfaces (not the marketing home hero).
 * Checkpoint 6 pages should compose inside this shell.
 */
export function AppHeader({ active }: AppHeaderProps) {
  const { user, signOut, loading } = useAuth();
  const signedIn = !!user && !loading;

  return (
    <header className="border-border bg-background/90 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <nav className="flex items-center gap-3 text-sm font-medium">
          <Link
            href="/"
            className={cn(
              "text-foreground hover:text-primary",
              active === "home" && "text-primary",
            )}
          >
            Fosterfolio
          </Link>
          <Link
            href="/search"
            className={cn(
              "text-muted-foreground hover:text-foreground",
              active === "search" && "text-foreground",
            )}
          >
            Search
          </Link>
          {signedIn ? (
            <Link
              href="/profile"
              className={cn(
                "text-muted-foreground hover:text-foreground",
                active === "profile" && "text-foreground",
              )}
            >
              Profile
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button type="button" variant="outline" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          ) : (
            <Link
              href="/auth/sign-in"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
