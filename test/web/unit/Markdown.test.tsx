import { Markdown } from "@client/components/markdown";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Markdown", () => {
  it("renders plain markdown text", () => {
    render(<Markdown>{"Hello **world**"}</Markdown>);
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getByText("world").tagName).toBe("STRONG");
  });

  it("renders an ATX heading as a heading, not body text", () => {
    render(<Markdown>{"# Heading\n\nThis is my bio"}</Markdown>);

    const heading = screen.getByRole("heading", { level: 1, name: "Heading" });
    expect(heading).toHaveClass("text-2xl", "font-semibold");
    expect(screen.getByText("This is my bio").tagName).toBe("P");
  });

  it("renders lists and links", () => {
    render(
      <Markdown>{"[a shelter](https://example.com)\n\n- bullets\n- another"}</Markdown>,
    );

    expect(screen.getByRole("link", { name: "a shelter" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps single newlines as line breaks", () => {
    render(<Markdown>{"Line one\nLine two"}</Markdown>);

    const paragraph = screen.getByText(/Line one/).closest("p");
    expect(paragraph).toHaveTextContent(/Line one/);
    expect(paragraph).toHaveTextContent(/Line two/);
    expect(paragraph?.querySelector("br")).not.toBeNull();
  });

  it("renders <u> pairs as underline without enabling other raw HTML", () => {
    const { container } = render(<Markdown>{"I <u>love</u> naps <b>x</b>"}</Markdown>);

    expect(screen.getByText("love").tagName).toBe("U");
    expect(container.querySelector("b")).toBeNull();
  });
});
