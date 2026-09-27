import { useAuth } from "@client/auth";
import { AppHeader } from "@client/components/layout";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authLoggedOut, authSignedIn } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

describe("AppHeader", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
  });

  it("shows brand, primary nav, search, and sign in when logged out", () => {
    render(<AppHeader active="home" />);

    expect(screen.getByRole("link", { name: "Fosterfolio" })).toHaveAttribute("href", "/");
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Feed" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Feed" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
    expect(screen.queryByRole("button", { name: /account/i })).not.toBeInTheDocument();
  });

  it("opens an account menu with profile and sign out when signed in", () => {
    const auth = authSignedIn();
    vi.mocked(useAuth).mockReturnValue(auth);

    render(<AppHeader active="profile" />);

    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));

    expect(screen.getByRole("menuitem", { name: "Your profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("opens the mobile menu without treating nav links as buttons", () => {
    render(<AppHeader active="profile" />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("heading", { name: "Menu" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Mobile" }).querySelector("a[href='/']"),
    ).toBeTruthy();
  });
});
