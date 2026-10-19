import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "./support/renderWithProviders";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type RenderOptions = {
  callback: (token: string) => void;
  "error-callback": () => void;
};

/** Stands in for Cloudflare's script. Each execute answers with the next queued outcome. */
function fakeTurnstile(outcomes: Array<string | "error">) {
  let options: RenderOptions | null = null;
  const calls: string[] = [];
  window.turnstile = {
    render: (_el, opts) => {
      options = opts;
      return "widget-1";
    },
    reset: (widgetId) => {
      calls.push(`reset:${widgetId}`);
    },
    execute: (widgetId) => {
      calls.push(`execute:${widgetId}`);
      const outcome = outcomes.shift();
      queueMicrotask(() => {
        if (outcome === "error") options?.["error-callback"]();
        else if (outcome) options?.callback(outcome);
      });
    },
  };
  return calls;
}

async function renderForm() {
  // The site key is read when the module loads.
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
  vi.resetModules();
  const { InquiryForm } = await import("@client/features/inquiries");
  renderWithQueryClient(<InquiryForm targetUserId="owner-1" />);
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Jamie" } });
  fireEvent.change(screen.getByLabelText("Your email"), {
    target: { value: "jamie@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello" } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /send inquiry/i }));
}

function sentTokens(fetchMock: ReturnType<typeof vi.fn>): unknown[] {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes("/inquiries"))
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)).turnstileToken);
}

describe("InquiryForm with Turnstile", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "inq-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    delete window.turnstile;
    document.head.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((s) => s.remove());
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("explains a blocked spam check instead of doing nothing", async () => {
    await renderForm();
    document.head
      .querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
      ?.dispatchEvent(new Event("error"));

    submit();

    expect(await screen.findByText(/spam check didn't load/i)).toBeInTheDocument();
    expect(sentTokens(fetchMock)).toEqual([]);
    expect(screen.getByRole("button", { name: /send inquiry/i })).toBeEnabled();
    expect(screen.getByLabelText("Message")).toHaveValue("Hello");
  });

  it("explains a spam check that is still loading", async () => {
    await renderForm();

    submit();

    expect(await screen.findByText(/spam check didn't load/i)).toBeInTheDocument();
    expect(sentTokens(fetchMock)).toEqual([]);
  });

  it("shows an error when the challenge fails, then resets the widget for the retry", async () => {
    const calls = fakeTurnstile(["error", "token-2"]);
    await renderForm();

    submit();
    expect(await screen.findByText(/couldn't confirm you're a person/i)).toBeInTheDocument();
    expect(sentTokens(fetchMock)).toEqual([]);

    submit();
    await waitFor(() => expect(sentTokens(fetchMock)).toEqual(["token-2"]));
    expect(calls).toEqual([
      "reset:widget-1",
      "execute:widget-1",
      "reset:widget-1",
      "execute:widget-1",
    ]);
  });

  it("gets a fresh token when retrying after a server error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: "INTERNAL", message: "Server error" } }),
    });
    const calls = fakeTurnstile(["token-1", "token-2"]);
    await renderForm();

    submit();
    expect(await screen.findByText("Server error")).toBeInTheDocument();
    submit();

    expect(await screen.findByText("Inquiry sent")).toBeInTheDocument();
    expect(sentTokens(fetchMock)).toEqual(["token-1", "token-2"]);
    expect(calls.filter((call) => call.startsWith("reset"))).toHaveLength(2);
  });

  it("disables the form while the challenge runs", async () => {
    fakeTurnstile([]);
    await renderForm();

    submit();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    });
    expect(screen.getByLabelText("Message")).toBeDisabled();
  });
});
