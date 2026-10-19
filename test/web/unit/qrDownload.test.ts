import { downloadQr, qrFilename, QR_DOWNLOAD_SIZES } from "@client/components/qr/qrDownload";
import { afterEach, describe, expect, it, vi } from "vitest";

const toDataURL = vi.fn(async () => "data:image/png;base64,AAA");
const toString = vi.fn(async () => "<svg/>");
vi.mock("qrcode", () => ({ default: { toDataURL, toString } }));

const [web, a4, print] = QR_DOWNLOAD_SIZES;

describe("qrDownload", () => {
  afterEach(() => vi.clearAllMocks());

  it("names files by size", () => {
    expect(qrFilename("Mochi the Dog", web)).toBe("Mochi-the-Dog-fosterfolio-qr-web.png");
    expect(qrFilename("  ", print)).toBe("share-fosterfolio-qr-print.svg");
  });

  it("renders PNGs at the size's width with a print-safe quiet zone", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await downloadQr("https://x.test/@a", "Mochi", a4);
    expect(toDataURL).toHaveBeenCalledWith("https://x.test/@a", expect.objectContaining({ width: 1240, margin: 4, errorCorrectionLevel: "M" }));
    expect(click).toHaveBeenCalledOnce();
  });

  it("renders large prints as SVG", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:qr");
    URL.revokeObjectURL = vi.fn();
    await downloadQr("https://x.test/@a", "Mochi", print);
    expect(toString).toHaveBeenCalledWith("https://x.test/@a", expect.objectContaining({ type: "svg" }));
  });
});
