"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { AppShell } from "@client/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { authenticatedApiRequest } from "@client/lib/authenticatedApi";
import { useEffect, useState } from "react";

interface ProfileResponse {
  id: string;
  email: string | null;
}

export function ProfilePage() {
  const { loading } = useRequireAuth();
  const { getAccessToken, user } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const token = await getAccessToken();
      if (!token) {
        setError("No access token is available for profile lookup.");
        return;
      }

      const response = await authenticatedApiRequest("/profile", {
        token,
        method: "GET",
      });

      if (!response.ok) {
        setError("Unable to load profile from API.");
        return;
      }

      const data = (await response.json()) as ProfileResponse;
      setProfile(data);
      setError(null);
    }

    if (!loading) {
      loadProfile().catch(() => setError("Unable to load profile from API."));
    }
  }, [getAccessToken, loading]);

  if (loading) {
    return (
      <AppShell active="profile">
        <main className="p-8">Loading profile...</main>
      </AppShell>
    );
  }

  return (
    <AppShell active="profile">
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
        <h1 className="text-3xl font-semibold">Profile</h1>

        <Card>
          <CardHeader>
            <CardTitle>Authenticated user</CardTitle>
            <CardDescription>
              Email and id are from verified Supabase JWT claims.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Email:</strong>{" "}
              {profile?.email || user?.email || "No email available"}
            </p>
            <p>
              <strong>User ID:</strong>{" "}
              {profile?.id || user?.id || "No id available"}
            </p>
            {error ? <p className="text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
