import { InquiryForm } from "@client/features/inquiries";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "./support/renderWithProviders";

describe("InquiryForm", () => {
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
