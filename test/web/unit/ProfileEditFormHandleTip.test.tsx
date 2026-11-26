import type { UserOwner } from "@client/features/users";
import { useUpdateUserMutation } from "@client/features/users";
import { ProfileEditForm } from "@client/pages/profile";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return { ...actual, useUpdateUserMutation: vi.fn() };
});

const TIP_KEY = "fosterfolio:handle-change-tip-seen";
const TIP_TEXT = "Hey, you can only change your username twice in 30 days.";

const baseUser: UserOwner = {
  id: "u1",
  handle: "brendan",
  email: "you@example.com",
  displayName: "Brendan",
  avatarUrl: null,
  bio: null,
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

describe("ProfileEditForm handle-change tip", () => {
  const mutate = vi.fn();
  const onSaved = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    mutate.mockReset();
    onSaved.mockReset();
    vi.mocked(useUpdateUserMutation).mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useUpdateUserMutation>);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  function saveWithNewHandle(user: UserOwner, newHandle: string) {
    render(<ProfileEditForm user={user} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: newHandle } });
    fireEvent.submit(screen.getByRole("form", { name: "Edit name and bio" }));
    // Simulate the server accepting the save.
    const options = mutate.mock.calls[0][1] as { onSuccess: () => void };
    act(() => options.onSuccess());
  }

  it("shows the success message and the tip the first time a handle changes", () => {
    saveWithNewHandle(baseUser, "brendan2");

    expect(screen.getByText(/handle updated/i)).toBeInTheDocument();
    expect(screen.getByText(TIP_TEXT)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(TIP_KEY)).not.toBeNull();
  });

  it("does not show the tip again once it has been recorded", () => {
    window.localStorage.setItem(TIP_KEY, "1");
    saveWithNewHandle(baseUser, "brendan2");

    expect(screen.getByText(/handle updated/i)).toBeInTheDocument();
    expect(screen.queryByText(TIP_TEXT)).not.toBeInTheDocument();
  });

  it("closes right away when only the bio changed", () => {
    render(<ProfileEditForm user={baseUser} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "B" } });
    fireEvent.submit(screen.getByRole("form", { name: "Edit name and bio" }));
    act(() => (mutate.mock.calls[0][1] as { onSuccess: () => void }).onSuccess());

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(TIP_TEXT)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TIP_KEY)).toBeNull();
  });

  it("does not show the tip when the user had no handle yet (first set)", () => {
    saveWithNewHandle({ ...baseUser, handle: null }, "brendan");

    expect(screen.queryByText(TIP_TEXT)).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("clears the tip when dismissed and then closes", () => {
    saveWithNewHandle(baseUser, "brendan2");
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(screen.queryByText(TIP_TEXT)).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
