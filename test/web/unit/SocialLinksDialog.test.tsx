import type { UserOwner } from "@client/features/users";
import { useUpdateUserMutation } from "@client/features/users";
import { SocialLinksDialog } from "@client/pages/profile/SocialLinksDialog";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return { ...actual, useUpdateUserMutation: vi.fn() };
});

const user: UserOwner = {
  id: "u1",
  handle: null,
  email: "you@example.com",
  displayName: "Alex Foster",
  avatarUrl: null,
  bio: null,
  city: null,
  state: null,
  zipCode: null,
  lat: null,
  lng: null,
  sheltersText: null,
  socialLinks: [{ label: "Instagram", url: "https://example.com/alex" }],
  starCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const mutate = vi.fn();

describe("SocialLinksDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate.mockImplementation((_vars, opts) => opts?.onSuccess?.(user));
    vi.mocked(useUpdateUserMutation).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateUserMutation>);
  });

  it("prefills the existing links when opened", () => {
    render(<SocialLinksDialog user={user} open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Where you share" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Instagram")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com/alex")).toBeInTheDocument();
    expect(screen.getByLabelText("Link 1 label").parentElement).toHaveClass(
      "flex-col",
      "lg:flex-row",
    );
    expect(screen.getByLabelText("Link 1 label").parentElement?.parentElement).toHaveClass(
      "divide-y",
      "lg:divide-y-0",
    );
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("adds a link and saves only fully-filled links", async () => {
    render(<SocialLinksDialog user={user} open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    // The freshly added, empty row must not survive the save filter.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        {
          id: "u1",
          payload: {
            socialLinks: [{ label: "Instagram", url: "https://example.com/alex" }],
          },
        },
        expect.anything(),
      ),
    );
  });

  it("removes a link", async () => {
    render(<SocialLinksDialog user={user} open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove link 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { id: "u1", payload: { socialLinks: [] } },
        expect.anything(),
      ),
    );
  });

  it("closes on a successful save", async () => {
    const onOpenChange = vi.fn();
    render(<SocialLinksDialog user={user} open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
