import type { UserOwner } from "@client/features/users";
import { useUpdateUserMutation } from "@client/features/users";
import { ProfileLocationCard } from "@client/pages/profile/ProfileLocationCard";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return { ...actual, useUpdateUserMutation: vi.fn() };
});

const user: UserOwner = {
  id: "u1",
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

describe("ProfileLocationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate.mockImplementation((_vars, opts) => opts?.onSuccess?.(user));
    mockMutation();
  });

  it("shows a compact read-only summary, not a label/value list", () => {
    render(<ProfileLocationCard user={user} />);

    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("Austin Pets Alive")).toBeInTheDocument();
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ZIP code")).not.toBeInTheDocument();
  });

  it("falls back to the ZIP and a placeholder when location/shelters are unset", () => {
    render(
      <ProfileLocationCard
        user={{ ...user, city: null, state: null, sheltersText: null }}
      />,
    );

    expect(screen.getByText("78701")).toBeInTheDocument();
    expect(screen.getByText("Add the shelters you work with")).toBeInTheDocument();
  });

  it("expands in place — no dialog — and prefills the current values", () => {
    render(<ProfileLocationCard user={user} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit location and shelters" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("ZIP code")).toHaveValue("78701");
    expect(screen.getByLabelText("Shelters you work with")).toHaveValue(
      "Austin Pets Alive",
    );
  });

  it("saves only zipCode and sheltersText, then collapses", async () => {
    render(<ProfileLocationCard user={user} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit location and shelters" }));

    fireEvent.change(screen.getByLabelText("ZIP code"), {
      target: { value: "10001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        {
          id: "u1",
          payload: { zipCode: "10001", sheltersText: "Austin Pets Alive" },
        },
        expect.anything(),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText("ZIP code")).not.toBeInTheDocument(),
    );
  });

  it("cancel discards edits without saving and collapses", () => {
    render(<ProfileLocationCard user={user} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit location and shelters" }));

    fireEvent.change(screen.getByLabelText("ZIP code"), {
      target: { value: "00000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("ZIP code")).not.toBeInTheDocument();
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
  });

  it("shows the save error message verbatim", () => {
    mockMutation({ error: new Error("ZIP lookup failed.") });
    render(<ProfileLocationCard user={user} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit location and shelters" }));

    expect(screen.getByText("ZIP lookup failed.")).toBeInTheDocument();
  });
});
