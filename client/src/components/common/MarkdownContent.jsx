import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import { Check, Copy } from 'lucide-react';

/**
 * Configure marked renderer with Portal styling, Prism syntax highlighting, and copy controls
 */
const renderer = new marked.Renderer();

renderer.link = function ({ href, title, text }) {
  // Validate protocol to prevent dangerous javascript: or data: URIs
  const cleanHref = href && /^(https?:\/\/|mailto:|\/)/i.test(href) ? href : '#';
  const isExternal = cleanHref.startsWith('http');
  const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${cleanHref}"${targetAttr}${titleAttr} class="text-[#007aff] hover:underline font-medium break-words">${text}</a>`;
};

renderer.heading = function ({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  const classes = {
    1: 'editorial-h1 text-2xl sm:text-3xl font-normal text-[var(--portal-heading)] mt-6 mb-3',
    2: 'editorial-h2 text-xl sm:text-2xl font-normal text-[var(--portal-heading)] mt-5 mb-2.5',
    3: 'text-lg sm:text-xl font-semibold text-[var(--portal-heading)] mt-4 mb-2',
    4: 'text-base sm:text-lg font-semibold text-[var(--portal-heading)] mt-3 mb-1.5',
    5: 'text-sm sm:text-base font-semibold text-[var(--portal-heading)] mt-2 mb-1',
    6: 'text-xs sm:text-sm font-semibold uppercase tracking-wider text-[var(--portal-meta)] mt-2 mb-1'
  };
  return `<h${depth} class="${classes[depth] || classes[3]}">${text}</h${depth}>`;
};

renderer.blockquote = function ({ tokens }) {
  const body = this.parser.parse(tokens);
  return `<blockquote class="border-l-4 border-[#007aff]/60 pl-4 py-1 my-3 text-[var(--portal-meta)] italic bg-black/[0.02] dark:bg-white/[0.02] rounded-r-lg">${body}</blockquote>`;
};

renderer.list = function ({ ordered, items }) {
  const type = ordered ? 'ol' : 'ul';
  const listClass = ordered ? 'list-decimal' : 'list-disc';
  const body = items.map((item) => renderer.listitem(item)).join('');
  return `<${type} class="${listClass} pl-6 my-3 space-y-1 text-[var(--portal-text)]">${body}</${type}>`;
};

renderer.listitem = function ({ tokens }) {
  const body = this.parser.parseInline(tokens);
  return `<li class="leading-relaxed">${body}</li>`;
};

renderer.code = function ({ text, lang }) {
  const validLang = lang && Prism.languages[lang] ? lang : 'javascript';
  let highlighted = text;
  try {
    if (Prism.languages[validLang]) {
      highlighted = Prism.highlight(text, Prism.languages[validLang], validLang);
    }
  } catch (e) {
    highlighted = text;
  }

  const encodedCode = encodeURIComponent(text);
  const langLabel = lang ? lang.toUpperCase() : 'CODE';

  return `
    <div class="code-block-container my-4 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-canvas-secondary)] overflow-hidden shadow-xs" data-raw-code="${encodedCode}">
      <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--portal-card-border)] bg-black/[0.03] dark:bg-white/[0.03] text-xs">
        <span class="font-mono font-semibold text-[var(--portal-meta)] text-[11px] tracking-wider uppercase">${langLabel}</span>
        <button type="button" class="copy-code-btn inline-flex items-center gap-1 text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors px-2 py-1 rounded cursor-pointer" aria-label="Copy code">
          <svg class="copy-icon w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span class="copy-text text-[11px] font-medium">Copy</span>
        </button>
      </div>
      <pre class="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed m-0 text-[var(--portal-heading)]"><code class="language-${validLang}">${highlighted}</code></pre>
    </div>
  `;
};

renderer.codespan = function ({ text }) {
  return `<code class="px-1.5 py-0.5 rounded-md font-mono text-[13px] bg-black/[0.06] dark:bg-white/[0.08] text-[#007aff] dark:text-[#5aa2ff] border border-black/5 dark:border-white/10">${text}</code>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true
});

/**
 * Clean sanitization options via DOMPurify
 */
const sanitizeConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'b', 'strong', 'i', 'em',
    'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'hr', 'br', 'div', 'span',
    'button', 'svg', 'rect', 'path'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title', 'class', 'data-raw-code', 'type',
    'aria-label', 'viewBox', 'fill', 'stroke', 'stroke-width', 'width', 'height', 'x', 'y', 'rx', 'ry', 'd'
  ]
};

/**
 * Pre-processes markdown to linkify hashtags into topic navigation links
 * while strictly ignoring fenced code blocks, inline code, and markdown headers.
 */
function linkifyHashtags(text) {
  if (!text) return '';
  const codeBlocks = [];
  // Preserve fenced code blocks
  let preserved = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  // Preserve inline code
  preserved = preserved.replace(/`[^`\n]+`/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  // Linkify hashtags: matches #tag preceded by non-word or start-of-line
  preserved = preserved.replace(/(^|[^a-zA-Z0-9_&/])#([a-zA-Z0-9_]{1,50})\b/g, (match, prefix, tag) => {
    return `${prefix}[#${tag}](/topics/${tag.toLowerCase()})`;
  });
  // Restore code blocks
  preserved = preserved.replace(/__CODE_BLOCK_(\d+)__/g, (match, idx) => {
    return codeBlocks[Number(idx)];
  });
  return preserved;
}

export const MarkdownContent = ({ content = '', className = '' }) => {
  const html = useMemo(() => {
    if (!content) return '';
    try {
      const linkified = linkifyHashtags(content);
      const rawHtml = marked.parse(linkified);
      return DOMPurify.sanitize(rawHtml, sanitizeConfig);
    } catch (err) {
      console.error('Markdown parse error:', err);
      return DOMPurify.sanitize(content);
    }
  }, [content]);

  const handleContainerClick = (e) => {
    const copyBtn = e.target.closest('.copy-code-btn');
    if (!copyBtn) return;

    const codeContainer = copyBtn.closest('.code-block-container');
    if (!codeContainer) return;

    const rawCodeEncoded = codeContainer.getAttribute('data-raw-code');
    if (!rawCodeEncoded) return;

    const code = decodeURIComponent(rawCodeEncoded);
    navigator.clipboard.writeText(code).then(() => {
      const copyText = copyBtn.querySelector('.copy-text');
      if (copyText) {
        const originalText = copyText.textContent;
        copyText.textContent = 'Copied!';
        copyBtn.classList.add('text-emerald-500');
        setTimeout(() => {
          copyText.textContent = originalText;
          copyBtn.classList.remove('text-emerald-500');
        }, 2000);
      }
    });
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`markdown-body text-sm sm:text-base leading-relaxed text-[var(--portal-text)] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownContent;
