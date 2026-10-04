import { useAuth } from "@client/auth";
import { HomePage } from "@client/pages/home";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authLoggedOut, authSignedIn } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
  });

  it("explains Fosterfolio instead of showing the feed", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Fosterfolio" })).toBeInTheDocument();
    expect(screen.getByText(/public pet bios and qr/i)).toBeInTheDocument();
    expect(screen.getByText(/message you/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByText("Share link")).toBeInTheDocument();
    expect(screen.queryByText("Someone scans")).not.toBeInTheDocument();
    expect(screen.queryByText(/write a short bio/i)).not.toBeInTheDocument();
    expect(screen.getByText(/pets and yourself/i)).toBeInTheDocument();
    expect(screen.getByText(/foster-me/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What you get" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Feed" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Search" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });

  it("sends signed-in visitors to their profile", () => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Your profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getByRole("heading", { name: "You're in" })).toBeInTheDocument();
  });
});
