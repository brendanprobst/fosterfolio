import { OwnerPageLayout } from "@client/components/layout/OwnerPageLayout";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("OwnerPageLayout", () => {
  it("renders the hero and a public preview with a jump link when the fold is filled", () => {
    render(
      <OwnerPageLayout
        fillFold
        hero={<p>Admin tools</p>}
        preview={<p>Guest story</p>}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Your tools" }),
    ).toHaveTextContent("Admin tools");
    expect(
      screen.getByRole("link", { name: /See your public page/ }),
    ).toHaveAttribute("href", "#public-preview");
    expect(
      screen.getByRole("region", { name: "Public preview" }),
    ).toHaveTextContent("Guest story");
    expect(
      screen.getByText("Public preview — this is what visitors see"),
    ).toBeInTheDocument();
  });

  it("omits the preview and the jump link on owner-only pages", () => {
    render(<OwnerPageLayout hero={<p>Profile tools</p>} />);

    expect(
      screen.getByRole("region", { name: "Your tools" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /See your public page/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Public preview" }),
    ).not.toBeInTheDocument();
  });
});
