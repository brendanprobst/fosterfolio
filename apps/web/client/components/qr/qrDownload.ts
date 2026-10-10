export type QrDownloadSize = {
  id: "web" | "a4" | "print";
  label: string;
  hint: string;
  format: "png" | "svg";
  /** PNG pixel width; ignored for SVG. */
  width?: number;
};

export const QR_DOWNLOAD_SIZES: readonly QrDownloadSize[] = [
  { id: "web", label: "For sharing on the web", hint: "PNG · 512px", format: "png", width: 512 },
  { id: "a4", label: "For an A4 flyer", hint: "PNG · 1240px (≈10 cm at 300 dpi)", format: "png", width: 1240 },
  { id: "print", label: "For large prints", hint: "SVG · scales to any size", format: "svg" },
];

const QR_COLORS = { dark: "#111111", light: "#ffffff" };

export function qrFilename(base: string, size: QrDownloadSize): string {
  const safe = base.trim().replace(/[^\w.-]+/g, "-") || "share";
  return `${safe}-fosterfolio-qr-${size.id}.${size.format}`;
}

/** Generates the file and clicks a temporary <a download>. */
export async function downloadQr(url: string, base: string, size: QrDownloadSize): Promise<void> {
  const QRCode = (await import("qrcode")).default;
  const common = { margin: 4, errorCorrectionLevel: "M" as const, color: QR_COLORS };
  let href: string;
  let revoke = false;
  if (size.format === "png") {
    href = await QRCode.toDataURL(url, { ...common, width: size.width });
  } else {
    const svg = await QRCode.toString(url, { ...common, type: "svg" });
    href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    revoke = true;
  }
  const link = document.createElement("a");
  link.href = href;
  link.download = qrFilename(base, size);
  link.click();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 0);
}
