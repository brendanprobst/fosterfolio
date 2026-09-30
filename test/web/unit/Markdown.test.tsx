import { Markdown } from "@client/components/markdown";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Markdown", () => {
  it("renders plain markdown text", () => {
    render(<Markdown>{"Hello **world**"}</Markdown>);
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getByText("world").tagName).toBe("STRONG");
  });

  it("keeps single newlines as line breaks", () => {
    render(<Markdown>{"Line one\nLine two"}</Markdown>);

    const paragraph = screen.getByText(/Line one/).closest("p");
    expect(paragraph).toHaveTextContent(/Line one/);
    expect(paragraph).toHaveTextContent(/Line two/);
    expect(paragraph?.querySelector("br")).not.toBeNull();
  });
});
