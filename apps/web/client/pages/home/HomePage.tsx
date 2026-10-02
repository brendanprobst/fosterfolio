"use client";

import { useAuth } from "@client/auth";
import { AppShell } from "@client/components/layout";
import { Badge } from "@client/components/ui/badge";
import { buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { cn } from "@client/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  HOME_LANDING_FEATURES,
  HOME_LANDING_HERO_TITLE,
  HOME_LANDING_HOW,
  HOME_LANDING_STEPS,
  HOME_LANDING_TAGLINE,
} from "./homeLanding";

export function HomePage() {
  const { user, loading } = useAuth();
  const signedIn = !!user && !loading;

  return (
    <AppShell active="home">
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 md:py-16">
        <header className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Private beta</Badge>
            <Badge variant="outline">For foster homes</Badge>
          </div>
          <div className="space-y-3">
            <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              {HOME_LANDING_HERO_TITLE}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg md:text-xl">
              {HOME_LANDING_TAGLINE}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {signedIn ? (
              <>
                <Link href="/profile" className={cn(buttonVariants({ size: "lg" }))}>
                  Your profile
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/profile/pets/new"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Add a pet
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/sign-in" className={cn(buttonVariants({ size: "lg" }))}>
                  Sign in
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/auth/sign-up"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Request access
                </Link>
              </>
            )}
          </div>
        </header>

        {signedIn ? (
          <section aria-labelledby="home-signed-in-heading">
            <Card className="border-primary/25 bg-primary/5">
              <CardHeader className="pb-2">
                <h2
                  id="home-signed-in-heading"
                  className="font-heading text-lg font-semibold tracking-tight"
                >
                  You&apos;re in
                </h2>
                <CardDescription>
                  Visitors see the public bio and can send a message. This signed-in
                  page stays yours.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link href="/profile" className={cn(buttonVariants({ size: "sm" }))}>
                  Open your profile
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section aria-labelledby="fosterfolio-steps-heading">
          <h2
            id="fosterfolio-steps-heading"
            className="font-heading mb-6 text-2xl font-semibold tracking-tight"
          >
            How it works
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {HOME_LANDING_STEPS.map(({ step, title, icon: Icon }) => (
              <Card key={step}>
                <CardHeader className="flex flex-row items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    {step}
                  </Badge>
                  <Icon className="text-primary size-4 shrink-0" aria-hidden />
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="fosterfolio-features-heading">
          <h2
            id="fosterfolio-features-heading"
            className="font-heading mb-6 text-2xl font-semibold tracking-tight"
          >
            What you get
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {HOME_LANDING_FEATURES.map(({ title, body, icon: Icon }) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="text-primary size-4" aria-hidden />
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="fosterfolio-how-heading">
          <h2 id="fosterfolio-how-heading" className="sr-only">
            The short version
          </h2>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-start gap-3 pb-2">
              <div className="bg-primary/15 text-primary mt-0.5 rounded-md p-2">
                <Sparkles className="size-5" aria-hidden />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base font-medium">The short version</CardTitle>
                <CardDescription className="text-foreground/90 text-base leading-relaxed">
                  {HOME_LANDING_HOW}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </section>

        <footer className="text-muted-foreground border-border border-t pt-8 text-sm">
          <p>
            Fosterfolio is in private beta for a small group of fosters. Sign in if
            you have an invite.
          </p>
        </footer>
      </main>
    </AppShell>
  );
}
