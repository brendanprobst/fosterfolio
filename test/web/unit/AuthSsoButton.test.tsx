import type { AuthContextValue } from "@client/auth/authTypes";
import { useAuth } from "@client/auth";
import { SignInPage, SignUpPage } from "@client/pages/auth";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@client/auth", async () => {
  const actual = await vi.importActual<typeof import("@client/auth")>("@client/auth");
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function loggedOut(): AuthContextValue {
  return {
    user: null,
    session: null,
    loading: false,
    apiAuthAccepted: false,
    configError: null,
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    getAccessToken: vi.fn(),
  };
}

describe("SSO button visibility", () => {
  const googleSso = process.env.NEXT_PUBLIC_GOOGLE_SSO;

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(loggedOut());
  });

  afterEach(() => {
    if (googleSso === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_SSO;
    else process.env.NEXT_PUBLIC_GOOGLE_SSO = googleSso;
  });

  it("hides Continue with Google when the flag is unset", () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_SSO;
    render(<SignInPage />);
    expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it("shows Continue with Google on sign-in and sign-up only when GOOGLE_SSO is 1", () => {
    process.env.NEXT_PUBLIC_GOOGLE_SSO = "1";
    const { unmount } = render(<SignInPage />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with email/i })).toBeInTheDocument();
    unmount();
    render(<SignUpPage />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account with email/i })).toBeInTheDocument();
  });
});
