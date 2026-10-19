import HardBreak from "@tiptap/extension-hard-break";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

/**
 * Tiptap extensions that read and write the same markdown `<Markdown>` renders:
 * single newlines are line breaks (remark-breaks) and underline is `<u>…</u>`
 * (remarkUnderline) instead of Tiptap's default `++…++`.
 */
export const markdownExtensions = [
  StarterKit.configure({ underline: false, hardBreak: false }),
  Underline.extend({
    renderMarkdown: (node, helpers) => `<u>${helpers.renderChildren(node)}</u>`,
    markdownTokenizer: {
      name: "underline",
      level: "inline",
      start: (src) => src.indexOf("<u>"),
      tokenize(src, _tokens, lexer) {
        const match = /^<u>([\s\S]+?)<\/u>/.exec(src);
        if (!match) return undefined;
        return {
          type: "underline",
          raw: match[0],
          text: match[1],
          tokens: lexer.inlineTokens(match[1]),
        };
      },
    },
  }),
  HardBreak.extend({ renderMarkdown: () => "\n" }),
  Markdown.configure({ markedOptions: { breaks: true, gfm: true } }),
];
