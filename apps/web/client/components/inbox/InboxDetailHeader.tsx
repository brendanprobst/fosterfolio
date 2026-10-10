"use client";

import type { ReactNode } from "react";
import { absoluteReceived, relativeReceived } from "./formatReceived";

type InboxDetailHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  receivedAt: string;
  actions?: ReactNode;
};

export function InboxDetailHeader({ title, subtitle, receivedAt, actions }: InboxDetailHeaderProps) {
  const absolute = absoluteReceived(receivedAt);
  const relative = relativeReceived(receivedAt);

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? <div className="text-sm">{subtitle}</div> : null}
        <p className="text-muted-foreground text-sm">
          {absolute}
          {absolute && relative ? " · " : null}
          {relative}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
