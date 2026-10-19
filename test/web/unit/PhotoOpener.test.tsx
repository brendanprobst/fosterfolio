import { PhotoOpener } from "@client/components/PhotoOpener";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("PhotoOpener", () => {
  it("shows a thumbnail that opens the full photo in a dialog", () => {
    render(<PhotoOpener src="https://example.com/mochi.jpg" label="Photo from an update on Mochi" />);

    const thumb = screen.getByRole("button", { name: "Photo from an update on Mochi" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(thumb);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toContainElement(
      screen.getByRole("img", { name: "Photo from an update on Mochi" }),
    );
    expect(screen.getByRole("img", { name: "Photo from an update on Mochi" })).toHaveAttribute(
      "src",
      "https://example.com/mochi.jpg",
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
