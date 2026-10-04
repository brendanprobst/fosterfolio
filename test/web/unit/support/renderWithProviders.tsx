import type { AuthContextValue } from "@client/auth/authTypes";
import type { User } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

export const mockUser = { id: "u1", email: "you@example.com" } as User;

export function authLoggedOut(): AuthContextValue {
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

export function authSignedIn(user: User = mockUser): AuthContextValue {
  return {
    ...authLoggedOut(),
    user,
    session: {} as AuthContextValue["session"],
    apiAuthAccepted: true,
    getAccessToken: vi.fn().mockResolvedValue("test-token"),
  };
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const client = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
