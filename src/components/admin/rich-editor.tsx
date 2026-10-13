"use client";

import * as React from "react";
import { EditorContent, Extension, Mark, markInputRule, markPasteRule, mergeAttributes, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import "./rich-editor.css";

/** Спойлер как в Телеграме: на сайте текст скрыт, пока его не нажмут; ||текст|| при наборе тоже становится спойлером. */
const Spoiler = Mark.create({
  name: "spoiler",
  parseHTML() {
    return [{ tag: "span.tg-spoiler" }, { tag: "tg-spoiler" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "tg-spoiler" }), 0];
  },
  addInputRules() {
    return [markInputRule({ find: /(?:^|\s)(\|\|(?!\s)([^|]+)\|\|)$/, type: this.type })];
  },
  addPasteRules() {
    return [markPasteRule({ find: /(?:^|\s)(\|\|(?!\s)([^|]+)\|\|)/g, type: this.type })];
  },
});

/** Сочетания клавиш как в Телеграме на компьютере - в дополнение к привычным Ctrl+B, I, U. */
const TelegramKeys = Extension.create<{ onLink: (editor: Editor) => void }>({
  name: "telegramKeys",
  addOptions() {
    return { onLink: () => {} };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-x": () => this.editor.commands.toggleStrike(),
      "Mod-Shift-m": () => this.editor.commands.toggleCode(),
      "Mod-Shift-p": () => this.editor.commands.toggleMark("spoiler"),
      "Mod-Shift-.": () => this.editor.commands.toggleBlockquote(),
      "Mod-Shift-n": () => this.editor.chain().unsetAllMarks().clearNodes().run(),
      "Mod-k": () => {
        this.options.onLink(this.editor);
        return true;
      },
    };
  },
});

type Format = "bold" | "italic" | "underline" | "strike" | "blockquote" | "code" | "spoiler" | "link";

const ICON = {
  spoiler: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 3l18 18M10.6 5.1A9.9 9.9 0 0 1 12 5c5 0 8.5 4.2 9.6 6.4a1.4 1.4 0 0 1 0 1.2 15 15 0 0 1-2.9 3.7M6.6 6.6C4.5 8 3.1 10 2.4 11.4a1.4 1.4 0 0 0 0 1.2C3.5 14.8 7 19 12 19c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
    </svg>
  ),
  quote: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 11.5C4 7.9 6.2 5.6 9.4 5l.6 1.7c-1.8.6-2.9 1.9-3 3.6H10V18H4v-6.5Zm10 0c0-3.6 2.2-5.9 5.4-6.5l.6 1.7c-1.8.6-2.9 1.9-3 3.6H20V18h-6v-6.5Z" />
    </svg>
  ),
  clear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 6h11M10.5 6 8 18M14 14l6 6M20 14l-6 6" />
    </svg>
  ),
};

/** Кнопки в порядке меню форматирования Телеграма; в подсказке - сочетание клавиш. */
const BUTTONS: Array<{ mark: Format; title: string; keys: string; face: React.ReactNode }> = [
  { mark: "bold", title: "Жирный", keys: "Ctrl+B", face: <b>Ж</b> },
  { mark: "italic", title: "Курсив", keys: "Ctrl+I", face: <i>К</i> },
  { mark: "underline", title: "Подчёркнутый", keys: "Ctrl+U", face: <u>Ч</u> },
  { mark: "strike", title: "Зачёркнутый", keys: "Ctrl+Shift+X", face: <s>З</s> },
  { mark: "blockquote", title: "Цитата", keys: "Ctrl+Shift+.", face: ICON.quote },
  { mark: "code", title: "Моноширинный", keys: "Ctrl+Shift+M", face: ICON.code },
  { mark: "spoiler", title: "Спойлер", keys: "Ctrl+Shift+P", face: ICON.spoiler },
  { mark: "link", title: "Ссылка", keys: "Ctrl+K", face: ICON.link },
];

/** Адрес для ссылки: без протокола - https; mailto и tg - как есть. */
function linkHref(raw: string): string {
  const v = raw.trim();
  return /^(https?:|mailto:|tg:)/i.test(v) ? v : `https://${v}`;
}

/** Текст новости с форматированием как в Телеграме: жирный, курсив, подчёркнутый, зачёркнутый, цитата,
    моноширинный, спойлер и ссылки. Отдаёт HTML; пустой текст - пустая строка. */
export function RichEditor({ value, onChange, placeholder = "Текст новости…" }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkValue, setLinkValue] = React.useState("");

  const openLink = (ed: Editor) => {
    setLinkValue((ed.getAttributes("link").href as string | undefined) ?? "");
    setLinkOpen(true);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: "https" },
      }),
      Spoiler,
      TelegramKeys.configure({ onLink: openLink }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: { attributes: { class: "rich-editor-content", "aria-label": "Текст новости", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? (Object.fromEntries(BUTTONS.map((b) => [b.mark, editor.isActive(b.mark)])) as Record<Format, boolean>)
        : null,
  });

  function toggle(mark: Format) {
    if (!editor) return;
    if (mark === "link") return openLink(editor);
    const chain = editor.chain().focus();
    if (mark === "blockquote") chain.toggleBlockquote().run();
    else chain.toggleMark(mark).run();
  }

  function applyLink() {
    if (!editor) return;
    const raw = linkValue.trim();
    if (!raw) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else if (editor.state.selection.empty && !editor.isActive("link")) {
      const href = linkHref(raw);
      editor.chain().focus().insertContent({ type: "text", text: raw, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkHref(raw) }).run();
    }
    setLinkOpen(false);
  }

  return (
    <div className="rich-editor">
      <div className="rich-editor-bar" role="toolbar" aria-label="Форматирование">
        {BUTTONS.map((b) => (
          <button
            key={b.mark}
            type="button"
            className="rich-editor-btn"
            aria-pressed={!!active?.[b.mark]}
            aria-label={b.title}
            title={`${b.title} (${b.keys})`}
            disabled={!editor}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggle(b.mark)}
          >
            {b.face}
          </button>
        ))}
        <span className="rich-editor-sep" aria-hidden />
        <button
          type="button"
          className="rich-editor-btn"
          aria-label="Без форматирования"
          title="Без форматирования (Ctrl+Shift+N)"
          disabled={!editor}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          {ICON.clear}
        </button>
      </div>
      {linkOpen && (
        <div className="rich-editor-link">
          <input
            autoFocus
            className="input"
            placeholder="https://… — пусто, чтобы убрать ссылку"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setLinkOpen(false);
                editor?.commands.focus();
              }
            }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={applyLink}>
            <span>Готово</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLinkOpen(false)}>
            <span>Отмена</span>
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
