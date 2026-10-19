import { useAuth } from "@client/auth";
import { AppHeader } from "@client/components/layout";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authLoggedOut, authSignedIn } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@client/lib/fosterfolioFeatureFlags", () => ({
  isFosterfolioFeedEnabled: vi.fn(() => false),
  isFosterfolioSearchEnabled: vi.fn(() => false),
}));

vi.mock("@client/features/notifications/useUnreadNotificationCount", () => ({
  useUnreadNotificationCount: vi.fn(() => 0),
}));

describe("AppHeader", () => {
  beforeEach(async () => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
    const flags = await import("@client/lib/fosterfolioFeatureFlags");
    vi.mocked(flags.isFosterfolioFeedEnabled).mockReturnValue(false);
    vi.mocked(flags.isFosterfolioSearchEnabled).mockReturnValue(false);
  });

  it("shows brand and sign in, and hides feed and search when flags are off", () => {
    render(<AppHeader active="home" />);

    expect(screen.getByRole("link", { name: "Fosterfolio" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Feed" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Search" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
    expect(screen.queryByRole("button", { name: /account/i })).not.toBeInTheDocument();
  });

  it("shows feed and search nav when those flags are on", async () => {
    const flags = await import("@client/lib/fosterfolioFeatureFlags");
    vi.mocked(flags.isFosterfolioFeedEnabled).mockReturnValue(true);
    vi.mocked(flags.isFosterfolioSearchEnabled).mockReturnValue(true);

    render(<AppHeader active="feed" />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Feed" })).toHaveAttribute("href", "/feed");
    expect(within(nav).getByRole("link", { name: "Feed" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("href", "/search");
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
    expect(screen.getByRole("menuitem", { name: "Links & QR codes" })).toHaveAttribute(
      "href",
      "/profile/links",
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

  it("lists Links & QR codes in the mobile menu for a signed-in owner", () => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    render(<AppHeader active="links" />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const nav = screen.getByRole("navigation", { name: "Mobile" });
    const links = nav.querySelector("a[href='/profile/links']");
    expect(links).toHaveTextContent("Links & QR codes");
    expect(links).toHaveAttribute("aria-current", "page");
  });
});
