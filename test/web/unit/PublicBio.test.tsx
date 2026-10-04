import { BIO_PREVIEW_MAX_CHARS, BIO_PREVIEW_MAX_LINES } from "@client/lib/bioPreview";
import { PublicBio } from "@client/pages/users/PublicBio";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("PublicBio", () => {
  it("aligns with the name column and skips Read more for a short bio", () => {
    render(<PublicBio name="Alex Foster" bio="Fostering since 2019." />);

    expect(screen.getByText("Fostering since 2019.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bio" })).toHaveClass("ml-20");
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Read more..." })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the full bio in a dialog when the character preview is exceeded", () => {
    const bio = `${"A very long foster bio. ".repeat(20)}End.`;
    expect(bio.length).toBeGreaterThan(BIO_PREVIEW_MAX_CHARS);

    render(<PublicBio name="Alex Foster" bio={bio} />);

    fireEvent.click(screen.getByRole("button", { name: "Read more..." }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alex Foster" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("End.");
  });

  it("opens the full bio in a dialog when the line preview is exceeded", () => {
    const bio = Array.from(
      { length: BIO_PREVIEW_MAX_LINES + 1 },
      (_, i) => `Foster line ${i + 1}.`,
    ).join("\n");

    render(<PublicBio name="Alex Foster" bio={bio} />);

    fireEvent.click(screen.getByRole("button", { name: "Read more..." }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Foster line 6.");
  });
});
