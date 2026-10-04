"use client";

import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import type { User } from "@supabase/supabase-js";

export function SignedInCard(props: {
  user: User;
  onContinue: () => void;
  onSignOut: () => void;
}) {
  const { user, onContinue, onSignOut } = props;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">You're signed in</CardTitle>
        {user.email ? <CardDescription>{user.email}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button type="button" onClick={onContinue}>
          Continue
        </Button>
        <Button type="button" variant="outline" onClick={() => void onSignOut()}>
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
