"use client";

import { PhotoOpener } from "@client/components/PhotoOpener";
import { Markdown } from "@client/components/markdown";
import { petHref } from "@client/lib/petBioPath";
import { publicHandle, userProfileHref } from "@client/lib/userProfilePath";
import type { PostPublic } from "./types";
import Link from "next/link";

type PostCardProps = {
  post: PostPublic;
};

export function PostCard({ post }: PostCardProps) {
  const isPetUpdate = post.postType === "pet_update";
  const authorRef = publicHandle({
    id: post.authorId,
    handle: post.authorHandle,
  });
  const petLink = post.petId ? petHref(authorRef, post.petId) : null;

  return (
    <article className="border-border space-y-3 border-t pt-4">
      {isPetUpdate && post.petName ? (
        <div className="flex items-center gap-3">
          {post.petPrimaryPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.petPrimaryPhotoUrl}
              alt=""
              className="border-border size-10 rounded-md border object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {petLink ? (
                <Link href={petLink} className="text-primary hover:underline">
                  {post.petName}
                </Link>
              ) : (
                post.petName
              )}
            </p>
            <p className="text-muted-foreground text-xs">Pet update</p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          <Link
            href={userProfileHref(authorRef)}
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            Foster profile
          </Link>
        </p>
      )}
      {post.imageUrl ? (
        <PhotoOpener
          src={post.imageUrl}
          label={post.petName ? `Photo from an update on ${post.petName}` : "Photo from this post"}
        />
      ) : null}
      {post.bodyText ? <Markdown>{post.bodyText}</Markdown> : null}
      <p className="text-muted-foreground text-xs">
        {new Date(post.createdAt).toLocaleString()}
      </p>
    </article>
  );
}
