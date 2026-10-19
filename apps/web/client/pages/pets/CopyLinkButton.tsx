"use client";

import { Button } from "@client/components/ui/button";
import { absoluteUrl } from "@client/lib/absoluteUrl";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyLinkButtonProps = {
  path: string;
  className?: string;
  size?: "default" | "sm";
};

export function CopyLinkButton({ path, className, size = "default" }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl(path));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={className}
      onClick={() => void copyLink()}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
