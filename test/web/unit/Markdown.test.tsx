import { Markdown } from "@client/components/markdown";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Markdown", () => {
  it("renders plain markdown text", () => {
    render(<Markdown>{"Hello **world**"}</Markdown>);
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getByText("world").tagName).toBe("STRONG");
  });
});
