import type { UserOwner } from "@client/features/users";
import { useUpdateUserMutation } from "@client/features/users";
import { ProfileEditForm } from "@client/pages/profile";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return { ...actual, useUpdateUserMutation: vi.fn() };
});

const user: UserOwner = {
  id: "u1",
  handle: "brendan",
  email: "you@example.com",
  displayName: "Brendan",
  avatarUrl: null,
  bio: "Hello",
  city: null,
  state: null,
  zipCode: null,
  lat: null,
  lng: null,
  sheltersText: null,
  socialLinks: [],
  starCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("ProfileEditForm", () => {
  const mutate = vi.fn();

  beforeEach(() => {
    mutate.mockReset();
    vi.mocked(useUpdateUserMutation).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateUserMutation>);
    vi.spyOn(window, "confirm").mockReset();
  });

  it("omits handle when only bio changed", async () => {
    render(<ProfileEditForm user={user} />);
    await screen.findByRole("textbox", { name: "Bio" });
    fireEvent.click(screen.getByRole("button", { name: "Title" }));
    fireEvent.submit(screen.getByRole("form", { name: "Edit name and bio" }));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith(
      {
        id: "u1",
        payload: {
          displayName: "Brendan",
          bio: "## Hello",
        },
      },
      expect.any(Object),
    );
  });

  it("asks before clearing a claimed handle", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProfileEditForm user={user} />);
    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "" } });
    fireEvent.submit(screen.getByRole("form", { name: "Edit name and bio" }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/\/@brendan will stop working/),
    );
    expect(mutate).toHaveBeenCalledWith(
      {
        id: "u1",
        payload: {
          displayName: "Brendan",
          bio: "Hello",
          handle: null,
        },
      },
      expect.any(Object),
    );
  });

  it("asks before renaming a claimed handle", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProfileEditForm user={user} />);
    fireEvent.change(screen.getByLabelText("Handle"), {
      target: { value: "brendan_p" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Edit name and bio" }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/Change it to \/@brendan_p/),
    );
    expect(mutate).toHaveBeenCalledWith(
      {
        id: "u1",
        payload: {
          displayName: "Brendan",
          bio: "Hello",
          handle: "brendan_p",
        },
      },
      expect.any(Object),
    );
  });

  it("does not save when the handle-clear confirm is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ProfileEditForm user={user} />);
    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "" } });
    fireEvent.submit(screen.getByRole("form", { name: "Edit name and bio" }));

    expect(mutate).not.toHaveBeenCalled();
  });
});
