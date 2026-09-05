import { StarButton } from "@client/features/stars";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("StarButton", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("posts a session token and shows the updated count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ starred: true, created: true, starCount: 4 }),
      }),
    );

    render(<StarButton userId="owner-1" initialCount={3} />);
    expect(screen.getByText("3 stars")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Star" }));

    expect(await screen.findByText("4 stars")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Starred" })).toBeDisabled();

    vi.unstubAllGlobals();
  });
});
