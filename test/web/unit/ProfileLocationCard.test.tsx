import type { UserOwner } from "@client/features/users";
import { ProfileLocationCard } from "@client/pages/profile/ProfileLocationCard";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const user: UserOwner = {
  id: "u1",
  handle: null,
  email: "you@example.com",
  displayName: "Alex Foster",
  avatarUrl: null,
  bio: null,
  city: "Austin",
  state: "TX",
  zipCode: "78701",
  lat: null,
  lng: null,
  sheltersText: "Austin Pets Alive",
  socialLinks: [],
  starCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("ProfileLocationCard", () => {
  it("shows a compact read-only summary, not a label/value list", () => {
    render(<ProfileLocationCard user={user} onManage={vi.fn()} />);

    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("Austin Pets Alive")).toBeInTheDocument();
    expect(screen.queryByText(/help find adopters in your area/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ZIP code")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("falls back to the ZIP and a placeholder when location/shelters are unset", () => {
    render(
      <ProfileLocationCard
        user={{ ...user, city: null, state: null, sheltersText: null }}
        onManage={vi.fn()}
      />,
    );

    expect(screen.getByText("78701")).toBeInTheDocument();
    expect(screen.getByText("Add the shelters you work with")).toBeInTheDocument();
  });

  it("delegates editing to the dialog opener", () => {
    const onManage = vi.fn();
    render(<ProfileLocationCard user={user} onManage={onManage} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit location and shelters" }));

    expect(onManage).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
