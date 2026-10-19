"use client";

import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

type AppShellProps = {
  children: ReactNode;
  active?: "home" | "profile" | "links" | "search" | "feed";
};

export function AppShell({ children, active }: AppShellProps) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <AppHeader active={active} />
      {children}
    </div>
  );
}
