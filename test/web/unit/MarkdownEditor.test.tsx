import { MarkdownEditor } from "@client/components/markdown";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

async function renderEditor(value: string, props: Partial<Parameters<typeof MarkdownEditor>[0]> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <MarkdownEditor aria-label="Body" value={value} onChange={onChange} {...props} />,
  );
  const textbox = await screen.findByRole("textbox", { name: "Body" });
  return { ...utils, onChange, textbox };
}

describe("MarkdownEditor", () => {
  it("shows formatted text instead of raw markdown", async () => {
    const { textbox } = await renderEditor("## Hi\n\nI **love** <u>naps</u>\n\n- one");

    expect(within(textbox).getByRole("heading", { level: 2, name: "Hi" })).toBeInTheDocument();
    expect(within(textbox).getByText("love").tagName).toBe("STRONG");
    expect(within(textbox).getByText("naps").tagName).toBe("U");
    expect(within(textbox).getByRole("listitem")).toHaveTextContent("one");
    expect(textbox).not.toHaveTextContent("**");
  });

  it("puts title and subtitle first in the toolbar", async () => {
    await renderEditor("");
    const names = within(screen.getByRole("toolbar")).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Title", "Subtitle", "Bold", "Italic", "Underline", "Bulleted list"]);
  });

  it.each([
    ["Title", "## About me"],
    ["Subtitle", "### About me"],
    ["Bulleted list", "- About me"],
  ])("emits markdown when %s is applied", async (label, expected) => {
    const { onChange } = await renderEditor("About me");

    fireEvent.click(screen.getByRole("button", { name: label }));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expected));
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  });

  it("can place the toolbar below the text", async () => {
    const { textbox } = await renderEditor("x", { toolbarPosition: "bottom" });
    const toolbar = screen.getByRole("toolbar");

    expect(textbox.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("replaces the content when the value changes from outside", async () => {
    const { rerender, onChange, textbox } = await renderEditor("first");

    rerender(<MarkdownEditor aria-label="Body" value="**second**" onChange={onChange} />);

    await waitFor(() => expect(within(textbox).getByText("second").tagName).toBe("STRONG"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
