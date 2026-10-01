import { InquiryForm } from "@client/features/inquiries";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "./support/renderWithProviders";

describe("InquiryForm", () => {
  it("renders a disabled mock when locked so the foster cannot submit", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      <InquiryForm targetUserId="owner-1" targetPetId="pet-1" locked petName="Mochi" />,
    );

    expect(screen.getByRole("form", { name: "Contact the foster (preview)" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeDisabled();
    expect(screen.getByLabelText("Your email")).toBeDisabled();
    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByLabelText("Your name")).toHaveValue("Alex Visitor");
    expect(screen.getByLabelText("Message")).toHaveValue(
      "Hi! I'd love to learn more about Mochi and how to apply.",
    );
    expect(screen.getByRole("button", { name: /send inquiry/i })).toBeDisabled();
    const preview = screen.getByRole("form", { name: "Contact the foster (preview)" });
    expect(preview.querySelector("svg.lucide-lock")).toBeTruthy();
    expect(preview).toHaveTextContent("Locked for you, open to visitors");
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
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

    vi.unstubAllGlobals();
  });
});
