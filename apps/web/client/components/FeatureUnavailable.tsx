import { buttonVariants } from "@client/components/ui/button";
import { cn } from "@client/lib/utils";
import Link from "next/link";

type FeatureUnavailableProps = {
  title: string;
};

export function FeatureUnavailable({ title }: FeatureUnavailableProps) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        {title} isn&apos;t in this private beta. Check back later.
      </p>
      <p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to Fosterfolio
        </Link>
      </p>
    </main>
  );
}
