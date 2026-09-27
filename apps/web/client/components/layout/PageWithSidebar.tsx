import type { ReactNode } from "react";

type PageWithSidebarProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

/**
 * Main column + sticky aside. The aside is first in the DOM so it stacks above
 * the main column on small screens (same pattern as the profile editor).
 */
export function PageWithSidebar({ children, sidebar }: PageWithSidebarProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <aside className="space-y-4 lg:order-2 lg:sticky lg:top-20">{sidebar}</aside>
        <div className="min-w-0 space-y-8">{children}</div>
      </div>
    </div>
  );
}
