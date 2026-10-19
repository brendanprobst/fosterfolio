import { useAuth } from "@client/auth";
import { createPost } from "@client/features/posts/postsApi";
import type { PostPublic } from "@client/features/posts";
import { PostComposer } from "@client/features/posts/PostComposer";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSignedIn, renderWithQueryClient } from "./support/renderWithProviders";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@client/features/posts/postsApi", () => ({
  createPost: vi.fn(),
}));

// Tiptap does not take typed input in jsdom; a textarea stands in for the editor.
vi.mock("@client/components/markdown", () => ({
  MarkdownEditor: ({
    value,
    onChange,
    "aria-labelledby": labelledBy,
  }: {
    value: string;
    onChange: (value: string) => void;
    "aria-labelledby"?: string;
  }) => (
    <textarea
      aria-labelledby={labelledBy}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock("@client/features/storage", () => ({
  useMediaUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

describe("PostComposer locked to a pet", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    vi.mocked(createPost).mockResolvedValue({ id: "post-1" } as PostPublic);
  });

  it("posts a pet update for that pet without the type toggle or pet picker", async () => {
    const onPosted = vi.fn();
    renderWithQueryClient(<PostComposer petId="pet-1" onPosted={onPosted} />);

    expect(screen.queryByRole("button", { name: "General" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Pet")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Photo drop area" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("What's happening?"), {
      target: { value: "Mochi learned sit!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(createPost).toHaveBeenCalledWith("test-token", {
        postType: "pet_update",
        bodyText: "Mochi learned sit!",
        petId: "pet-1",
      }),
    );
    await waitFor(() => expect(onPosted).toHaveBeenCalled());
  });

  it("reports when the draft has unsaved text", () => {
    const onDirtyChange = vi.fn();
    renderWithQueryClient(<PostComposer petId="pet-1" onDirtyChange={onDirtyChange} />);
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByLabelText("What's happening?"), { target: { value: "Hi" } });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    fireEvent.change(screen.getByLabelText("What's happening?"), { target: { value: "  " } });
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
