"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Textarea } from "@client/components/ui/textarea";
import { useUpdateUserMutation } from "@client/features/users";
import type { SocialLink, UserOwner } from "@client/features/users";
import { FormEvent, useState } from "react";

type ProfileEditFormProps = {
  user: UserOwner;
};

export function ProfileEditForm({ user }: ProfileEditFormProps) {
  const mutation = useUpdateUserMutation();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [zipCode, setZipCode] = useState(user.zipCode ?? "");
  const [sheltersText, setSheltersText] = useState(user.sheltersText ?? "");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    user.socialLinks.length > 0 ? user.socialLinks : [],
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      id: user.id,
      payload: {
        displayName: displayName.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        zipCode: zipCode.trim() || null,
        sheltersText: sheltersText.trim() || null,
        socialLinks: socialLinks.filter((link) => link.label.trim() && link.url.trim()),
      },
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Edit profile">
      <h2 className="text-lg font-medium">Your profile</h2>
      {mutation.isSuccess ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>
            City and state update from your zip when the lookup succeeds; a bad
            zip still saves.
          </AlertDescription>
        </Alert>
      ) : null}
      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Failed to save profile."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">Display name</Label>
        <Input
          id="profile-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-avatar">Avatar URL</Label>
        <Input
          id="profile-avatar"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-bio">Bio (markdown)</Label>
        <Textarea
          id="profile-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-zip">ZIP code</Label>
        <Input
          id="profile-zip"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          autoComplete="postal-code"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-shelters">Shelters you work with</Label>
        <Input
          id="profile-shelters"
          value={sheltersText}
          onChange={(e) => setSheltersText(e.target.value)}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Social links</legend>
        {socialLinks.map((link, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <Input
              aria-label={`Link ${index + 1} label`}
              placeholder="Label"
              value={link.label}
              onChange={(e) => {
                const next = [...socialLinks];
                next[index] = { ...link, label: e.target.value };
                setSocialLinks(next);
              }}
            />
            <Input
              aria-label={`Link ${index + 1} URL`}
              placeholder="https://"
              value={link.url}
              onChange={(e) => {
                const next = [...socialLinks];
                next[index] = { ...link, url: e.target.value };
                setSocialLinks(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setSocialLinks(socialLinks.filter((_, i) => i !== index))
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSocialLinks([...socialLinks, { label: "", url: "" }])}
        >
          Add link
        </Button>
      </fieldset>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
