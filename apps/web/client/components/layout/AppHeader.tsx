"use client";

import { useAuth } from "@client/auth";
import { UserAvatar } from "@client/components/UserAvatar";
import { buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@client/components/ui/sheet";
import {
  isFosterfolioFeedEnabled,
  isFosterfolioSearchEnabled,
} from "@client/lib/fosterfolioFeatureFlags";
import { useUnreadNotificationCount } from "@client/features/notifications/useUnreadNotificationCount";
import { cn } from "@client/lib/utils";
import { LogOut, Inbox, Menu, PawPrint, Search, UserRound } from "lucide-react";
import Link from "next/link";

type AppHeaderProps = {
  /** Highlight the active primary nav item. */
  active?: "home" | "profile" | "search" | "feed";
};

function navLinkClass(isActive: boolean) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  );
}

/**
 * Shared top nav for product surfaces (not the marketing home hero).
 */
export function AppHeader({ active }: AppHeaderProps) {
  const { user, signOut, loading } = useAuth();
  const signedIn = !!user && !loading;
  const accountLabel = user?.email ?? "Account";
  const showFeed = isFosterfolioFeedEnabled();
  const showSearch = isFosterfolioSearchEnabled();
  const unread = useUnreadNotificationCount(signedIn);

  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Fosterfolio"
          className="text-foreground flex shrink-0 items-center gap-2 font-semibold tracking-tight"
        >
          <span className="bg-primary text-primary-foreground inline-flex size-8 items-center justify-center rounded-lg">
            <PawPrint aria-hidden className="size-4" />
          </span>
          <span aria-hidden className="hidden sm:inline">
            Fosterfolio
          </span>
        </Link>

        {showFeed ? (
          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 md:flex"
          >
            <Link
              href="/feed"
              className={navLinkClass(active === "feed")}
              aria-current={active === "feed" ? "page" : undefined}
            >
              Feed
            </Link>
          </nav>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <Link
              href="/inbox"
              aria-label={unread > 0 ? `Inbox, ${unread} unread` : "Inbox"}
              className="text-muted-foreground hover:bg-muted hover:text-foreground relative inline-flex size-9 items-center justify-center rounded-md"
            >
              <Inbox aria-hidden className="size-4" />
              {unread > 0 ? (
                <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4">
                  {unread}
                </span>
              ) : null}
            </Link>
          ) : null}
          {showSearch ? (
            <Link
              href="/search"
              aria-label="Search"
              className={cn(
                "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors sm:w-52 sm:px-3",
                active === "search" && "border-foreground/20 text-foreground",
              )}
            >
              <Search aria-hidden className="size-4 shrink-0" />
              <span aria-hidden className="hidden truncate sm:inline">
                Search
              </span>
            </Link>
          ) : null}

          {signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "rounded-full",
                )}
                aria-label="Account menu"
              >
                <UserAvatar name={accountLabel} url={null} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56 w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate font-normal">
                    {accountLabel}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem nativeButton={false} render={<Link href="/profile" />}>
                    <UserRound aria-hidden />
                    Your profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut aria-hidden />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth/sign-in" className={buttonVariants({ size: "sm" })}>
              Sign in
            </Link>
          )}

          <Sheet>
            <SheetTrigger
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
              aria-label="Open menu"
            >
              <Menu aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href="/"
                      className={navLinkClass(active === "home")}
                      aria-current={active === "home" ? "page" : undefined}
                    />
                  }
                >
                  Home
                </SheetClose>
                {showFeed ? (
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        href="/feed"
                        className={navLinkClass(active === "feed")}
                        aria-current={active === "feed" ? "page" : undefined}
                      />
                    }
                  >
                    Feed
                  </SheetClose>
                ) : null}
                {signedIn ? (
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        href="/inbox"
                        className={navLinkClass(false)}
                      />
                    }
                  >
                    Inbox{unread > 0 ? ` (${unread})` : ""}
                  </SheetClose>
                ) : null}
                {signedIn ? (
                  <SheetClose
                    nativeButton={false}
                    render={
                      <Link
                        href="/profile"
                        className={navLinkClass(active === "profile")}
                        aria-current={active === "profile" ? "page" : undefined}
                      />
                    }
                  >
                    Your profile
                  </SheetClose>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
