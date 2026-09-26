import type { UserOwner } from "@client/features/users";
import { ConnectedSitesCard } from "@client/pages/profile/ConnectedSitesCard";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const user: UserOwner = {
  id: "u1",
  email: "you@example.com",
  displayName: "Alex Foster",
  avatarUrl: null,
  bio: null,
  city: null,
  state: null,
  zipCode: null,
  lat: null,
  lng: null,
  sheltersText: null,
  socialLinks: [{ label: "Instagram", url: "https://example.com/alex" }],
  starCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("ConnectedSitesCard", () => {
  it("lists each link by label and lets it open in a new tab", () => {
    render(<ConnectedSitesCard user={user} onManage={vi.fn()} />);

    const link = screen.getByRole("link", { name: "Instagram" });
    expect(link).toHaveAttribute("href", "https://example.com/alex");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows a placeholder with no links", () => {
    render(<ConnectedSitesCard user={{ ...user, socialLinks: [] }} onManage={vi.fn()} />);

    expect(screen.getByText("No sites connected yet.")).toBeInTheDocument();
  });

  it("delegates management to the dialog opener, not itself", () => {
    const onManage = vi.fn();
    render(<ConnectedSitesCard user={user} onManage={onManage} />);

    fireEvent.click(screen.getByRole("button", { name: "Manage connected sites" }));

    expect(onManage).toHaveBeenCalledOnce();
  });
});
