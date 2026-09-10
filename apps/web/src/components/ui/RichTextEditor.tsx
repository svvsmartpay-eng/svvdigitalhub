import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered,
  Link2, Code2, Quote, Minus, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== Toolbar Button =====
function ToolbarBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded text-sm transition-colors select-none',
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

// ===== Separator =====
function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5 self-center" />;
}

// ===== Heading Dropdown =====
function HeadingDropdown({ editor }: { editor: any }) {
  const currentType = editor.isActive('heading', { level: 1 }) ? 'Heading 1'
    : editor.isActive('heading', { level: 2 }) ? 'Heading 2'
    : editor.isActive('heading', { level: 3 }) ? 'Heading 3'
    : 'Normal text';

  return (
    <select
      value={currentType}
      onChange={(e) => {
        const v = e.target.value;
        if (v === 'Normal text') editor.chain().focus().setParagraph().run();
        else if (v === 'Heading 1') editor.chain().focus().toggleHeading({ level: 1 }).run();
        else if (v === 'Heading 2') editor.chain().focus().toggleHeading({ level: 2 }).run();
        else if (v === 'Heading 3') editor.chain().focus().toggleHeading({ level: 3 }).run();
      }}
      className="text-xs border-0 bg-transparent text-gray-700 font-medium focus:outline-none cursor-pointer pr-1 py-1 rounded hover:bg-gray-100"
    >
      <option>Normal text</option>
      <option>Heading 1</option>
      <option>Heading 2</option>
      <option>Heading 3</option>
    </select>
  );
}

// ===== Rich Text Editor Props =====
interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  readOnly?: boolean;
}

// ===== Main Editor Component =====
export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Describe the issue in detail...',
  minHeight = '160px',
  className,
  readOnly = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'before:content-[attr(data-placeholder)] before:text-gray-400 before:float-left before:pointer-events-none before:h-0',
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn('border border-input rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-0 transition-shadow', className)}>
      {/* ===== Jira-like Toolbar ===== */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50 flex-wrap">
          {/* Text style dropdown */}
          <HeadingDropdown editor={editor} />
          <Sep />

          {/* Text formatting */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <Bold className="w-4 h-4" strokeWidth={2.5} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarBtn>
          <Sep />

          {/* Alignment */}
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
            <AlignLeft className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
            <AlignCenter className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
            <AlignRight className="w-4 h-4" />
          </ToolbarBtn>
          <Sep />

          {/* Lists */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <List className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
            <ListOrdered className="w-4 h-4" />
          </ToolbarBtn>
          <Sep />

          {/* Link, Code, Quote, HR */}
          <ToolbarBtn onClick={setLink} active={editor.isActive('link')} title="Insert link">
            <Link2 className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
            <Code2 className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <Quote className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
            <Minus className="w-4 h-4" />
          </ToolbarBtn>
          <Sep />

          {/* Undo / Redo */}
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-4 h-4" />
          </ToolbarBtn>
        </div>
      )}

      {/* ===== Editor Area ===== */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2.5 focus:outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}

// ===== Read-only rich text renderer =====
export function RichTextView({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  return (
    <div
      className={cn('prose prose-sm max-w-none text-gray-700 [&_a]:text-blue-600 [&_a]:underline [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
