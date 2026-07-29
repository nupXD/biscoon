import { Editor, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';

type NewsMediaItem = {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
};

type MountOptions = {
  element?: string;
  textarea?: string;
  media?: () => NewsMediaItem[];
};

declare global {
  interface Window {
    BiscoonNewsEditor?: {
      mount: (options?: MountOptions) => void;
      sync: () => void;
      insertMedia: (mediaOrId: NewsMediaItem | string) => boolean;
      runCommand: (command: string) => boolean;
      isActive: (command: string) => boolean;
      destroy: () => void;
    };
  }
}

let editor: Editor | null = null;
let textareaSelector = '#newsBody';
let mediaProvider: () => NewsMediaItem[] = () => [];

const NewsImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: element => element.getAttribute('data-news-media-id'),
        renderHTML: attributes => attributes.mediaId ? { 'data-news-media-id': attributes.mediaId } : {},
      },
    };
  },
});

const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      title: { default: null },
      mediaId: {
        default: null,
        parseHTML: element => element.getAttribute('data-news-media-id'),
        renderHTML: attributes => attributes.mediaId ? { 'data-news-media-id': attributes.mediaId } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: 'video[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes({ controls: '', preload: 'metadata' }, HTMLAttributes)];
  },
  addCommands() {
    return {
      setVideo: (attributes: Record<string, string>) => ({ commands }: any) => commands.insertContent({
        type: this.name,
        attrs: attributes,
      }),
    } as any;
  },
});

function esc(value = ''): string {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char));
}

function isHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value || '');
}

function inlineMarkdownToHtml(value: string): string {
  return esc(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[font=(serif|sans|mono)\]([\s\S]*?)\[\/font\]/g, (_match, family, body) => {
      const font = family === 'mono' ? 'monospace' : family;
      return `<span style="font-family: ${font}">${body}</span>`;
    });
}

function legacyBodyToHtml(value: string): string {
  const html: string[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdownToHtml(paragraph.join('\n'))}</p>`);
    paragraph = [];
  };

  String(value || '').split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      return;
    }
    if (/^\[\[media:[a-zA-Z0-9_-]+\]\]$/.test(trimmed)) {
      flush();
      html.push(`<p>${esc(trimmed)}</p>`);
      return;
    }
    if (trimmed.startsWith('## ')) {
      flush();
      html.push(`<h2>${inlineMarkdownToHtml(trimmed.slice(3))}</h2>`);
      return;
    }
    if (trimmed.startsWith('> ')) {
      flush();
      html.push(`<blockquote>${inlineMarkdownToHtml(trimmed.slice(2))}</blockquote>`);
      return;
    }
    paragraph.push(line);
  });
  flush();
  return html.join('') || '<p></p>';
}

function mediaElement(item: NewsMediaItem): HTMLElement {
  const figure = document.createElement('figure');
  figure.className = 'news-editor-media-node';
  if (item.type === 'video') {
    const video = document.createElement('video');
    video.src = item.url;
    video.controls = true;
    video.preload = 'metadata';
    video.dataset.newsMediaId = item.id;
    video.title = item.caption || '';
    figure.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.caption || '';
    img.dataset.newsMediaId = item.id;
    figure.appendChild(img);
  }
  if (item.caption) {
    const caption = document.createElement('figcaption');
    caption.textContent = item.caption;
    figure.appendChild(caption);
  }
  return figure;
}

function replaceMediaTokensWithNodes(html: string): string {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const mediaById = new Map(mediaProvider().map(item => [item.id, item]));
  wrapper.querySelectorAll('p').forEach(paragraph => {
    const match = /^\[\[media:([a-zA-Z0-9_-]+)\]\]$/.exec(paragraph.textContent?.trim() || '');
    if (!match) return;
    const item = mediaById.get(match[1]);
    if (item) paragraph.replaceWith(mediaElement(item));
  });
  return wrapper.innerHTML;
}

function editorContentFromTextarea(textarea: HTMLTextAreaElement): string {
  const value = textarea.value || '';
  const html = isHtml(value) ? value : legacyBodyToHtml(value);
  return replaceMediaTokensWithNodes(html);
}

function storedBodyFromEditorHtml(html: string): string {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  wrapper.querySelectorAll('img[data-news-media-id], video[data-news-media-id]').forEach(node => {
    const id = (node as HTMLElement).dataset.newsMediaId;
    if (!id) return;
    const paragraph = document.createElement('p');
    paragraph.textContent = `[[media:${id}]]`;
    const figure = node.closest('figure');
    (figure || node).replaceWith(paragraph);
  });
  return wrapper.innerHTML.trim();
}

function sync(): void {
  const textarea = document.querySelector(textareaSelector) as HTMLTextAreaElement | null;
  if (!textarea || !editor) return;
  textarea.value = storedBodyFromEditorHtml(editor.getHTML());
}

function resolveMedia(mediaOrId: NewsMediaItem | string): NewsMediaItem | null {
  if (typeof mediaOrId !== 'string') return mediaOrId;
  return mediaProvider().find(item => item.id === mediaOrId) || null;
}

function insertMedia(mediaOrId: NewsMediaItem | string): boolean {
  if (!editor) return false;
  const item = resolveMedia(mediaOrId);
  if (!item?.url) return false;
  if (item.type === 'video') {
    (editor.chain().focus() as any).setVideo({
      src: item.url,
      title: item.caption || '',
      mediaId: item.id,
    }).run();
  } else {
    (editor.chain().focus() as any).setImage({
      src: item.url,
      alt: item.caption || '',
      title: item.caption || '',
      mediaId: item.id,
    }).run();
  }
  sync();
  syncToolbar();
  return true;
}

function isActive(command: string): boolean {
  if (!editor) return false;
  if (command === 'bold') return editor.isActive('bold');
  if (command === 'italic') return editor.isActive('italic');
  if (command === 'h2') return editor.isActive('heading', { level: 2 });
  if (command === 'quote') return editor.isActive('blockquote');
  if (command === 'bullet') return editor.isActive('bulletList');
  if (command === 'ordered') return editor.isActive('orderedList');
  if (command === 'font-serif') return editor.isActive('textStyle', { fontFamily: 'serif' });
  if (command === 'font-sans') return editor.isActive('textStyle', { fontFamily: 'system-ui, sans-serif' });
  if (command === 'font-mono') return editor.isActive('textStyle', { fontFamily: 'monospace' });
  return false;
}

function runCommand(command: string): boolean {
  if (!editor) return false;
  const chain = editor.chain().focus();
  if (command === 'bold') chain.toggleBold().run();
  else if (command === 'italic') chain.toggleItalic().run();
  else if (command === 'h2') chain.toggleHeading({ level: 2 }).run();
  else if (command === 'quote') chain.toggleBlockquote().run();
  else if (command === 'bullet') chain.toggleBulletList().run();
  else if (command === 'ordered') chain.toggleOrderedList().run();
  else if (command === 'font-serif') chain.setFontFamily('serif').run();
  else if (command === 'font-sans') chain.setFontFamily('system-ui, sans-serif').run();
  else if (command === 'font-mono') chain.setFontFamily('monospace').run();
  else if (command === 'clear') chain.unsetAllMarks().clearNodes().run();
  else if (command === 'undo') chain.undo().run();
  else if (command === 'redo') chain.redo().run();
  else return false;
  sync();
  syncToolbar();
  return true;
}

function syncToolbar(): void {
  document.querySelectorAll<HTMLElement>('[data-news-format]').forEach(button => {
    const command = button.dataset.newsFormat || '';
    const active = ['undo', 'redo', 'clear'].includes(command) ? false : isActive(command);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function mount(options: MountOptions = {}): void {
  const element = document.querySelector(options.element || '#newsRichEditor') as HTMLElement | null;
  const textarea = document.querySelector(options.textarea || '#newsBody') as HTMLTextAreaElement | null;
  if (!element || !textarea) return;
  editor?.destroy();
  textareaSelector = options.textarea || '#newsBody';
  mediaProvider = options.media || (() => []);
  editor = new Editor({
    element,
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      Link.configure({ openOnClick: false }),
      NewsImage.configure({ inline: false, allowBase64: true }),
      Video,
    ],
    content: editorContentFromTextarea(textarea),
    editorProps: {
      attributes: {
        class: 'admin-news-rich-editor-surface',
        'data-placeholder': 'Start writing the article… Select text and use the toolbar to format.',
      },
    },
    onUpdate: () => {
      sync();
      syncToolbar();
    },
    onSelectionUpdate: syncToolbar,
    onFocus: syncToolbar,
  });
  sync();
  syncToolbar();
}

function destroy(): void {
  editor?.destroy();
  editor = null;
}

document.addEventListener('click', event => {
  const button = (event.target as HTMLElement | null)?.closest('[data-news-format]') as HTMLElement | null;
  if (!button) return;
  if (runCommand(button.dataset.newsFormat || '')) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

window.BiscoonNewsEditor = { mount, sync, insertMedia, runCommand, isActive, destroy };
