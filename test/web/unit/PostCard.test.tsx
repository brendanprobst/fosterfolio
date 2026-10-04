import { PostCard } from "@client/features/posts";
import type { PostPublic } from "@client/features/posts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function post(overrides: Partial<PostPublic> = {}): PostPublic {
  return {
    id: "post-1",
    authorId: "owner-1",
    authorHandle: "alex",
    postType: "general",
    petId: null,
    bodyText: "Hello foster world",
    imageUrl: null,
    geoLock: "local",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    petName: null,
    petPrimaryPhotoUrl: null,
    ...overrides,
  };
}

describe("PostCard", () => {
  it("links a general post to the author's handle when claimed", () => {
    render(<PostCard post={post()} />);
    expect(screen.getByRole("link", { name: "Foster profile" })).toHaveAttribute(
      "href",
      "/@alex",
    );
  });

  it("falls back to the author id when no handle is claimed", () => {
    render(<PostCard post={post({ authorHandle: null })} />);
    expect(screen.getByRole("link", { name: "Foster profile" })).toHaveAttribute(
      "href",
      "/@owner-1",
    );
  });

  it("links a pet update through the author's handle", () => {
    render(
      <PostCard
        post={post({
          postType: "pet_update",
          petId: "pet-1",
          petName: "Mochi",
        })}
      />,
    );
    expect(screen.getByRole("link", { name: "Mochi" })).toHaveAttribute(
      "href",
      "/@alex/pet/pet-1",
    );
  });
});
