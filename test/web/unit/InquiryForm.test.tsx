import { InquiryForm } from "@client/features/inquiries";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "./support/renderWithProviders";

function storeSource(channelKey: string) {
  sessionStorage.setItem(
    "ff_source",
    JSON.stringify({
      linkId: null,
      channelKey,
      referrerDomain: null,
      targetId: null,
    }),
  );
}

describe("InquiryForm", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("surfaces the API error message when send fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "INQUIRY_INVALID_INPUT",
            message: "Please provide a name, email, and message.",
          },
        }),
      }),
    );

    renderWithQueryClient(<InquiryForm targetUserId="owner-1" />);

    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Jamie" },
    });
    fireEvent.change(screen.getByLabelText("Your email"), {
      target: { value: "jamie@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send inquiry/i }));

    expect(
      await screen.findByText("Please provide a name, email, and message."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveValue("Jamie");
    expect(screen.getByLabelText("Your email")).toHaveValue("jamie@example.com");
    expect(screen.getByLabelText("Message")).toHaveValue("Hello");

    vi.unstubAllGlobals();
  });

  it("disables the whole form while sending", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    renderWithQueryClient(<InquiryForm targetUserId="owner-1" />);
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Jamie" },
    });
    fireEvent.change(screen.getByLabelText("Your email"), {
      target: { value: "jamie@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send inquiry/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    });
    expect(screen.getByLabelText("Your name")).toBeDisabled();
    expect(screen.getByLabelText("Your email")).toBeDisabled();
    expect(screen.getByLabelText("Message")).toBeDisabled();

    vi.unstubAllGlobals();
  });

  it("names the foster in the success copy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: "inq-1" }),
      }),
    );

    renderWithQueryClient(
      <InquiryForm targetUserId="owner-1" fosterName="Alex Foster" />,
    );
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Jamie" },
    });
    fireEvent.change(screen.getByLabelText("Your email"), {
      target: { value: "jamie@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send inquiry/i }));

    expect(await screen.findByText("Inquiry sent")).toBeInTheDocument();
    expect(
      screen.getByText(/Alex Foster will get your message by email/i),
    ).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("sends an optional zip code and does not put it on the success prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "inq-1", sourceToken: "tok" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    storeSource("instagram");

    renderWithQueryClient(
      <InquiryForm targetUserId="owner-1" targetPetId="pet-1" petName="Mochi" />,
    );
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Jamie" },
    });
    fireEvent.change(screen.getByLabelText("Your email"), {
      target: { value: "jamie@example.com" },
    });
    fireEvent.change(screen.getByLabelText("ZIP code (optional)"), {
      target: { value: "94107" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send inquiry/i }));

    expect(await screen.findByText("Inquiry sent")).toBeInTheDocument();
    expect(screen.queryByText("How did you hear about Mochi?")).not.toBeInTheDocument();
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.zipCode).toBe("94107");
    expect(body.sourceChannelKey).toBe("instagram");
    expect(body).not.toHaveProperty("sourceLinkId");

    vi.unstubAllGlobals();
  });

  it("asks how they heard about the pet only when the stored source is direct", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: "inq-1", sourceToken: "tok" }),
      }),
    );
    storeSource("direct");

    renderWithQueryClient(
      <InquiryForm targetUserId="owner-1" targetPetId="pet-1" petName="Mochi" />,
    );
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "Jamie" },
    });
    fireEvent.change(screen.getByLabelText("Your email"), {
      target: { value: "jamie@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send inquiry/i }));

    expect(await screen.findByText("How did you hear about Mochi?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lawn sign" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Friend or family" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
