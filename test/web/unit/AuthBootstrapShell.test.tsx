import { AuthBootstrapShell } from "@client/auth/AuthBootstrapShell";
import { AuthContext, type AuthContextValue } from "@client/auth/authTypes";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

function renderShell(pathname: string, loading = true) {
  vi.mocked(usePathname).mockReturnValue(pathname);
  const auth = { loading, configError: null } as unknown as AuthContextValue;
  return render(
    <AuthContext.Provider value={auth}>
      <AuthBootstrapShell>
        <p>Page content</p>
      </AuthBootstrapShell>
    </AuthContext.Provider>,
  );
}

describe("AuthBootstrapShell", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("shows no sign-in banner to a guest on a public page while the session restores", () => {
    window.history.replaceState(null, "", "/@alex");
    renderShell("/@alex");

    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.queryByText(/signing you in/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("gates a protected page with a neutral loader, not a sign-in message", () => {
    window.history.replaceState(null, "", "/profile");
    renderShell("/profile");

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByText(/signing you in/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Page content")).not.toBeInTheDocument();
  });

  it("says it is signing you in when returning from an OAuth sign-in", () => {
    window.history.replaceState(null, "", "/auth/sign-in?next=%2Fprofile&code=abc123");
    renderShell("/auth/sign-in");

    expect(screen.getByRole("status")).toHaveTextContent("Signing you in…");
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("says it is signing you in on a protected page reached with an auth code", () => {
    window.history.replaceState(null, "", "/profile?code=abc123");
    renderShell("/profile");

    expect(screen.getByRole("status")).toHaveTextContent("Signing you in…");
  });

  it("renders only the page once the session is known", () => {
    window.history.replaceState(null, "", "/auth/sign-in?code=abc123");
    renderShell("/auth/sign-in", false);

    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
