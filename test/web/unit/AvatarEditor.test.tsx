import type { UserOwner } from "@client/features/users";
import { useUpdateUserMutation } from "@client/features/users";
import { useMediaUpload } from "@client/features/storage";
import { AvatarEditor } from "@client/pages/profile/AvatarEditor";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@client/features/storage", () => ({
  useMediaUpload: vi.fn(),
}));

vi.mock("@client/features/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@client/features/users")>();
  return {
    ...actual,
    useUpdateUserMutation: vi.fn(),
  };
});

const withoutPicture: UserOwner = {
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
  socialLinks: [],
  starCount: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const withPicture: UserOwner = {
  ...withoutPicture,
  avatarUrl: "https://cdn.example.com/me.jpg",
};

const uploadMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();

function mockHooks(overrides?: { uploadError?: Error; pending?: boolean }) {
  vi.mocked(useMediaUpload).mockReturnValue({
    mutateAsync: uploadMutateAsync,
    isPending: overrides?.pending ?? false,
    error: overrides?.uploadError ?? null,
  } as unknown as ReturnType<typeof useMediaUpload>);

  vi.mocked(useUpdateUserMutation).mockReturnValue({
    mutateAsync: updateMutateAsync,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useUpdateUserMutation>);
}

function pickFile(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("file input not rendered");
  const file = new File(["x"], "me.jpg", { type: "image/jpeg" });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe("AvatarEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadMutateAsync.mockResolvedValue({
      publicUrl: "https://cdn.example.com/me.jpg",
      path: "u1/me.jpg",
      contentType: "image/jpeg",
    });
    updateMutateAsync.mockResolvedValue(withoutPicture);
    mockHooks();
  });

  it("renders the picture, helper text, and replace/clear actions with no dialog of its own", () => {
    render(<AvatarEditor user={withPicture} />);

    expect(screen.getByRole("img", { name: "Alex Foster" })).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG, WebP, or GIF/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear profile picture" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // The picture communicates its own state; no "set" / "not set" label.
    expect(screen.queryByText(/profile picture (set|yet)/i)).not.toBeInTheDocument();
  });

  it("labels the action for a user with no picture, and hides Clear", () => {
    render(<AvatarEditor user={withoutPicture} />);

    expect(screen.getByRole("button", { name: "Add image" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear profile picture" }),
    ).not.toBeInTheDocument();
  });

  it("uploads the picked file and saves only the avatar URL", async () => {
    const { container } = render(<AvatarEditor user={withoutPicture} />);

    const file = pickFile(container);

    await waitFor(() => expect(uploadMutateAsync).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: "u1",
        payload: { avatarUrl: "https://cdn.example.com/me.jpg" },
      }),
    );
  });

  it("clears the picture", async () => {
    render(<AvatarEditor user={withPicture} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear profile picture" }));

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: "u1",
        payload: { avatarUrl: null },
      }),
    );
  });

  it("shows the upload error message verbatim", () => {
    mockHooks({ uploadError: new Error("Storage cap reached: free up space.") });
    render(<AvatarEditor user={withoutPicture} />);

    expect(screen.getByText("Storage cap reached: free up space.")).toBeInTheDocument();
  });

  it("disables the options while an upload is in flight", () => {
    mockHooks({ pending: true });
    render(<AvatarEditor user={withPicture} />);

    expect(screen.getByRole("button", { name: "Replace image" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear profile picture" })).toBeDisabled();
    expect(screen.getByText("Uploading…")).toBeInTheDocument();
  });
});
