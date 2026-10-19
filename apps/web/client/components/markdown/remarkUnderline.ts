import type { Nodes, Parent, PhrasingContent } from "mdast";

/**
 * Markdown has no underline syntax, so the editor writes `<u>text</u>`.
 * Raw HTML stays disabled (no rehype-raw); this plugin only turns matching
 * `<u>` / `</u>` pairs within one paragraph into a `<u>` element.
 */
export function remarkUnderline() {
  return (tree: Nodes) => visit(tree);
}

function visit(node: Nodes) {
  if (!("children" in node)) return;
  const parent = node as Parent;
  parent.children.forEach((child) => visit(child as Nodes));

  for (let open = 0; open < parent.children.length; open++) {
    if (!isTag(parent.children[open], "<u>")) continue;
    const close = parent.children.findIndex((child, i) => i > open && isTag(child, "</u>"));
    if (close === -1) return;
    const underline = {
      type: "emphasis",
      data: { hName: "u" },
      children: parent.children.slice(open + 1, close) as PhrasingContent[],
    } satisfies PhrasingContent;
    parent.children.splice(open, close - open + 1, underline);
  }
}

function isTag(node: Parent["children"][number], tag: string) {
  return node.type === "html" && node.value.trim().toLowerCase() === tag;
}
