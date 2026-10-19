"use client";

import { Sparkline } from "@client/components/charts";
import { seriesConfig } from "@client/components/charts/chartConfig";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@client/components/ui/alert";
import { ChartContainer } from "@client/components/ui/chart";
import { Badge } from "@client/components/ui/badge";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Separator } from "@client/components/ui/separator";
import { cn } from "@client/lib/utils";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Component,
  Info,
} from "lucide-react";

export function UiGalleryPage() {
  return (
    <div className="bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-6">
          <div>
            <p className="text-muted-foreground text-sm">Fosterfolio</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Component gallery
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm">
              Samples of the buttons, forms, and cards used across Fosterfolio.
            </p>
          </div>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-12 px-4 py-10">
        <section data-testid="ui-section-buttons" aria-labelledby="gallery-buttons">
          <h2 id="gallery-buttons" className="font-heading mb-4 text-lg font-medium">
            Buttons
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Variants and sizes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button size="icon" aria-label="Check">
              <Check />
            </Button>
          </div>
        </section>

        <Separator />

        <section data-testid="ui-section-badges" aria-labelledby="gallery-badges">
          <h2 id="gallery-badges" className="font-heading mb-4 text-lg font-medium">
            Badges
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </section>

        <Separator />

        <section data-testid="ui-section-form" aria-labelledby="gallery-form">
          <h2 id="gallery-form" className="font-heading mb-4 text-lg font-medium">
            Form fields
          </h2>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Sample field</CardTitle>
              <CardDescription>A labeled text field.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="gallery-email">Email</Label>
              <Input
                id="gallery-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="off"
              />
            </CardContent>
            <CardFooter>
              <Button size="sm" type="button">
                Submit
                <ChevronRight className="ml-1" />
              </Button>
            </CardFooter>
          </Card>
        </section>

        <Separator />

        <section data-testid="ui-section-cards" aria-labelledby="gallery-cards">
          <h2 id="gallery-cards" className="font-heading mb-4 text-lg font-medium">
            Cards
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Component className="size-4" />
                  Card one
                </CardTitle>
                <CardDescription>Supporting text for the first card.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Use cards for grouped content and actions.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card two</CardTitle>
                <CardDescription>With footer actions.</CardDescription>
              </CardHeader>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" type="button">
                  Cancel
                </Button>
                <Button size="sm" type="button">
                  Continue
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <Separator />

        <section data-testid="ui-section-alerts" aria-labelledby="gallery-alerts">
          <h2 id="gallery-alerts" className="font-heading mb-4 text-lg font-medium">
            Alerts
          </h2>
          <div className="space-y-3">
            <Alert>
              <Info />
              <AlertTitle>Default alert</AlertTitle>
              <AlertDescription>Use alerts for inline messages.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Destructive</AlertTitle>
              <AlertDescription>
                Shown for errors or destructive outcomes.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        <Separator />

        <section data-testid="ui-section-charts" aria-labelledby="gallery-charts">
          <h2 id="gallery-charts" className="font-heading mb-4 text-lg font-medium">
            Charts
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Views</p>
              <Sparkline values={[4, 6, 5, 9, 8, 12, 11]} series="views" label="Views this week" />
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">Inquiries</p>
              <Sparkline values={[0, 1, 0, 2, 1, 1, 3]} series="inquiries" label="Inquiries this week" />
            </div>
          </div>
          <figure className="mt-6 space-y-2">
            <figcaption className="text-muted-foreground text-sm">Views by channel</figcaption>
            <ChartContainer config={seriesConfig} className="aspect-auto h-28 w-full">
              <BarChart
                data={[
                  { name: "Lawn sign", value: 42 },
                  { name: "Instagram", value: 28 },
                  { name: "Flyer", value: 11 },
                ]}
                layout="vertical"
                margin={{ left: 0, right: 16 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} />
                <Bar dataKey="value" name="Views" fill="var(--color-views)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </figure>
        </section>
      </main>
    </div>
  );
}
