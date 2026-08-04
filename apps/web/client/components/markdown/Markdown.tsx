"use client";

import ReactMarkdown from "react-markdown";

type MarkdownProps = {
  children: string;
  className?: string;
};

/**
 * Plain-markdown renderer for bios and posts (no rich text / BlockNote).
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={
        className ??
        "prose prose-neutral text-foreground max-w-none prose-p:leading-relaxed prose-a:text-primary"
      }
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
