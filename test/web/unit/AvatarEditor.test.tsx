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

const user: UserOwner = {
  id: "u1",
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
    updateMutateAsync.mockResolvedValue(user);
    mockHooks();
  });

  it("uploads the picked file and saves only the avatar URL", async () => {
    const { container } = render(<AvatarEditor user={user} />);

    const file = pickFile(container);

    await waitFor(() => expect(uploadMutateAsync).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: "u1",
        payload: { avatarUrl: "https://cdn.example.com/me.jpg" },
      }),
    );
  });

  it("offers removal only once a picture exists", async () => {
    const { rerender } = render(<AvatarEditor user={user} />);
    expect(screen.getByRole("button", { name: "Change profile picture" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();

    rerender(
      <AvatarEditor user={{ ...user, avatarUrl: "https://cdn.example.com/me.jpg" }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: "u1",
        payload: { avatarUrl: null },
      }),
    );
  });

  it("shows the upload error message verbatim", () => {
    mockHooks({ uploadError: new Error("Storage cap reached: free up space.") });
    render(<AvatarEditor user={user} />);
    expect(screen.getByText("Storage cap reached: free up space.")).toBeInTheDocument();
  });

  it("disables the control while an upload is in flight", () => {
    mockHooks({ pending: true });
    render(<AvatarEditor user={user} />);
    expect(screen.getByRole("button", { name: "Change profile picture" })).toBeDisabled();
    expect(screen.getByText("Uploading…")).toBeInTheDocument();
  });
});
