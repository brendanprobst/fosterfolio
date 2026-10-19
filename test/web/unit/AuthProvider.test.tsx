import { AuthProvider } from "@client/auth";
import { verifyAuthUsableForApi } from "@client/auth/verifyAuthUsableForApi";
import { getSupabaseClient } from "@client/lib/supabaseClient";
import { readViewerHint, writeViewerHint } from "@client/lib/viewerHint";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/@alex" }));
vi.mock("@client/lib/supabaseClient", () => ({ getSupabaseClient: vi.fn() }));
vi.mock("@client/auth/verifyAuthUsableForApi", () => ({ verifyAuthUsableForApi: vi.fn() }));

type AuthListener = (event: string, session: Session | null) => void;

function fakeSupabase() {
  let listener: AuthListener = () => {};
  const client = {
    auth: {
      onAuthStateChange: (cb: AuthListener) => {
        listener = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  } as unknown as SupabaseClient;
  return { client, emit: (event: string, session: Session | null) => listener(event, session) };
}

describe("AuthProvider viewer hint", () => {
  beforeEach(() => {
    window.localStorage.clear();
    writeViewerHint({ id: "owner-1", handle: "alex" });
  });

  it("clears the hint when Supabase reports a sign-out", () => {
    const supabase = fakeSupabase();
    vi.mocked(getSupabaseClient).mockReturnValue(supabase.client);

    render(<AuthProvider>page</AuthProvider>);
    act(() => supabase.emit("SIGNED_OUT", null));

    expect(readViewerHint()).toBeNull();
  });

  it("clears the hint when the restored session is not usable", async () => {
    const supabase = fakeSupabase();
    vi.mocked(getSupabaseClient).mockReturnValue(supabase.client);
    vi.mocked(verifyAuthUsableForApi).mockResolvedValue({ session: null, apiAuthAccepted: false });

    render(<AuthProvider>page</AuthProvider>);
    act(() => supabase.emit("INITIAL_SESSION", null));

    await waitFor(() => expect(readViewerHint()).toBeNull());
  });

  it("keeps the hint when the session restores", async () => {
    const supabase = fakeSupabase();
    vi.mocked(getSupabaseClient).mockReturnValue(supabase.client);
    const session = { user: { id: "owner-1" }, access_token: "t" } as Session;
    vi.mocked(verifyAuthUsableForApi).mockResolvedValue({ session, apiAuthAccepted: true });

    render(<AuthProvider>page</AuthProvider>);
    act(() => supabase.emit("INITIAL_SESSION", session));

    await waitFor(() => expect(verifyAuthUsableForApi).toHaveBeenCalled());
    expect(readViewerHint()).toEqual({ id: "owner-1", handle: "alex" });
  });
});
