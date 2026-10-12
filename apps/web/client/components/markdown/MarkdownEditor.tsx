"use client";

import { Button } from "@client/components/ui/button";
import { Separator } from "@client/components/ui/separator";
import { cn } from "@client/lib/utils";
import { type Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  Underline,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { markdownExtensions } from "./markdownExtensions";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Where the formatting toolbar sits relative to the text. */
  toolbarPosition?: "top" | "bottom";
  disabled?: boolean;
  className?: string;
};

type ToolbarAction = {
  label: string;
  icon: LucideIcon;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const BLOCK_ACTIONS: ToolbarAction[] = [
  {
    label: "Title",
    icon: Heading2,
    isActive: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Subtitle",
    icon: Heading3,
    isActive: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
];

const INLINE_ACTIONS: ToolbarAction[] = [
  {
    label: "Bold",
    icon: Bold,
    isActive: (e) => e.isActive("bold"),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    label: "Italic",
    icon: Italic,
    isActive: (e) => e.isActive("italic"),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    label: "Underline",
    icon: Underline,
    isActive: (e) => e.isActive("underline"),
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    label: "Bulleted list",
    icon: List,
    isActive: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
];

/**
 * Mirrors the `<Markdown>` renderer's look inside the editable area, since
 * Tailwind preflight flattens headings and lists.
 */
const contentClass = cn(
  "min-h-24 px-2.5 py-2 text-base leading-relaxed outline-none md:text-sm",
  "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight",
  "[&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:tracking-tight",
  "[&_p]:mb-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li_p]:mb-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
);

/**
 * Rich-text editor that reads and writes markdown. Users see formatted text
 * while typing; the stored value stays plain markdown for `<Markdown>`.
 */
export function MarkdownEditor({
  value,
  onChange,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  toolbarPosition = "top",
  disabled = false,
  className,
}: MarkdownEditorProps) {
  // Last markdown we emitted, so echoes of our own onChange don't reset the doc.
  const emitted = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: markdownExtensions,
    content: value,
    contentType: "markdown",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
        role: "textbox",
        "aria-multiline": "true",
        class: cn(contentClass, className),
      },
    },
    onUpdate: ({ editor }) => {
      const next = editor.getMarkdown().trim();
      emitted.current = next;
      onChangeRef.current(next);
    },
  });

  useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? [...BLOCK_ACTIONS, ...INLINE_ACTIONS].map((action) => action.isActive(editor))
        : [],
  });

  function renderButton(action: ToolbarAction, index: number) {
    return (
      <Button
        key={action.label}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={action.label}
        aria-pressed={active?.[index] ?? false}
        title={action.label}
        disabled={disabled || !editor}
        className="aria-pressed:bg-muted aria-pressed:text-foreground"
        // Keep focus (and the selection) in the editor.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor && action.run(editor)}
      >
        <action.icon />
      </Button>
    );
  }

  const toolbar = (
    <div
      role="toolbar"
      aria-label="Formatting"
      className={cn(
        "flex items-center gap-0.5 p-1",
        toolbarPosition === "top" ? "border-b" : "border-t",
      )}
    >
      {BLOCK_ACTIONS.map(renderButton)}
      <Separator orientation="vertical" className="mx-1 my-1" />
      {INLINE_ACTIONS.map((action, i) => renderButton(action, BLOCK_ACTIONS.length + i))}
    </div>
  );

  return (
    <div
      className={cn(
        "border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 rounded-lg border transition-colors focus-within:ring-3",
        disabled && "opacity-50",
      )}
    >
      {toolbarPosition === "top" ? toolbar : null}
      <EditorContent editor={editor} />
      {toolbarPosition === "bottom" ? toolbar : null}
    </div>
  );
}
