import { ExpandableInquiryForm } from "@client/features/inquiries";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "./support/renderWithProviders";

describe("ExpandableInquiryForm", () => {
  it("closes the expand dialog after a successful send", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: "inq-1" }),
      }),
    );

    renderWithQueryClient(
      <ExpandableInquiryForm
        targetUserId="owner-1"
        targetPetId="pet-1"
        fosterName="Alex Foster"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Your name"), {
      target: { value: "Jamie" },
    });
    fireEvent.change(dialog.getByLabelText("Your email"), {
      target: { value: "jamie@example.com" },
    });
    fireEvent.change(dialog.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(dialog.getByRole("button", { name: /send inquiry/i }));

    expect(await screen.findByText("Inquiry sent")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(/Alex Foster will get your message by email/i),
    ).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
