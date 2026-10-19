"use client";

import { buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { cn } from "@client/lib/utils";
import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { downloadQr, QR_DOWNLOAD_SIZES } from "./qrDownload";

type QrDownloadMenuProps = {
  /** Absolute URL encoded in the QR. */
  url: string;
  filenameBase: string;
  triggerLabel?: string;
  /** Merged onto the trigger button styles. */
  triggerClassName?: string;
  triggerSize?: "default" | "sm";
};

export function QrDownloadMenu({
  url,
  filenameBase,
  triggerLabel = "Download QR",
  triggerClassName,
  triggerSize = "sm",
}: QrDownloadMenuProps) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "outline", size: triggerSize }), triggerClassName)}
        >
          <Download aria-hidden />
          {triggerLabel}
          <ChevronDown aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {QR_DOWNLOAD_SIZES.map((size) => (
            <DropdownMenuItem
              key={size.id}
              onClick={() => {
                setError(null);
                downloadQr(url, filenameBase, size).catch(() => setError("Could not create that file."));
              }}
            >
              <div className="flex flex-col">
                <span>{size.label}</span>
                <span className="text-muted-foreground text-xs">{size.hint}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
