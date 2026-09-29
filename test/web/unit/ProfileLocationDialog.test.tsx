import type { UserOwner } from "@client/features/users";
import { useUpdateUserMutation } from "@client/features/users";
import { ProfileLocationDialog } from "@client/pages/profile/ProfileLocationDialog";
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
  city: "Austin",
  state: "TX",
  zipCode: "78701",
  lat: null,
  lng: null,
  sheltersText: "Austin Pets Alive",
  socialLinks: [],
  starCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const mutate = vi.fn();

function mockMutation(overrides?: { isPending?: boolean; error?: Error }) {
  vi.mocked(useUpdateUserMutation).mockReturnValue({
    mutate,
    isPending: overrides?.isPending ?? false,
    isError: Boolean(overrides?.error),
    error: overrides?.error ?? null,
  } as unknown as ReturnType<typeof useUpdateUserMutation>);
}

describe("ProfileLocationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate.mockImplementation((_vars, opts) => opts?.onSuccess?.(user));
    mockMutation();
  });

  it("opens as a modal with ZIP help and a shelter-link table", () => {
    render(<ProfileLocationDialog user={user} open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Location & shelters" })).toBeInTheDocument();
    expect(screen.getByLabelText("ZIP code")).toHaveValue("78701");
    expect(screen.getByText(/help find adopters in your area/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Shelter 1 name")).toHaveValue("Austin Pets Alive");
    expect(screen.getByLabelText("Shelter 1 website")).toHaveValue("");
  });

  it("saves zipCode and shelters as JSON text, then closes", async () => {
    const onOpenChange = vi.fn();
    render(<ProfileLocationDialog user={user} open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText("ZIP code"), {
      target: { value: "10001" },
    });
    fireEvent.change(screen.getByLabelText("Shelter 1 website"), {
      target: { value: "https://apa.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add shelter" }));
    fireEvent.change(screen.getByLabelText("Shelter 2 name"), {
      target: { value: "Muttville" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        {
          id: "u1",
          payload: {
            zipCode: "10001",
            sheltersText: JSON.stringify([
              { name: "Austin Pets Alive", url: "https://apa.example" },
              { name: "Muttville", url: "" },
            ]),
          },
        },
        expect.anything(),
      ),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("closing without save does not mutate", () => {
    const onOpenChange = vi.fn();
    render(<ProfileLocationDialog user={user} open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText("ZIP code"), {
      target: { value: "00000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows the save error message verbatim", () => {
    mockMutation({ error: new Error("ZIP lookup failed.") });
    render(<ProfileLocationDialog user={user} open onOpenChange={vi.fn()} />);

    expect(screen.getByText("ZIP lookup failed.")).toBeInTheDocument();
  });
});
