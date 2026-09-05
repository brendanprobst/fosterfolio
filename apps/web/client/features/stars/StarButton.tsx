"use client";

import { Button } from "@client/components/ui/button";
import {
  getStarSessionToken,
  hasStarredUser,
  markUserStarred,
} from "@client/lib/starSession";
import { Star } from "lucide-react";
import { useState } from "react";
import { addStar } from "./starsApi";

type StarButtonProps = {
  userId: string;
  initialCount: number;
};

export function StarButton({ userId, initialCount }: StarButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [starred, setStarred] = useState(() => hasStarredUser(userId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStar() {
    if (starred || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await addStar(userId, getStarSessionToken());
      setCount(result.starCount);
      setStarred(true);
      markUserStarred(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not star this profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={starred ? "secondary" : "outline"}
          size="sm"
          onClick={() => void onStar()}
          disabled={starred || pending}
          aria-pressed={starred}
        >
          <Star className={starred ? "fill-current" : undefined} />
          {starred ? "Starred" : "Star"}
        </Button>
        <span className="text-muted-foreground text-sm">
          {count} {count === 1 ? "star" : "stars"}
        </span>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
