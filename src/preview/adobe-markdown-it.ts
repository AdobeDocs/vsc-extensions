import { workspace, WorkspaceFolder } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import MarkdownIt = require('markdown-it');

/**
 * Resolve a markdown link target to a path relative to the source markdown file
 * (same behavior as the former built-in preview replaceLink hook).
 */
export function makeRelativeLinkForPreview(
  link: string,
  sourceFsPath: string,
  folders: readonly WorkspaceFolder[] | undefined
): string {
  const trimmed = link.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  /* In-doc fragment links; never treat as filesystem paths. */
  if (trimmed.startsWith('#')) {
    return trimmed;
  }

  const baseDir = path.dirname(sourceFsPath);

  let absolute: string | undefined;
  if (path.isAbsolute(trimmed)) {
    const n = path.normalize(trimmed);
    if (fs.existsSync(n)) {
      absolute = n;
    }
  } else {
    const fromDoc = path.normalize(path.resolve(baseDir, trimmed));
    if (fs.existsSync(fromDoc)) {
      absolute = fromDoc;
    } else if (folders) {
      for (const f of folders) {
        const candidate = path.normalize(path.resolve(f.uri.fsPath, trimmed));
        if (fs.existsSync(candidate)) {
          absolute = candidate;
          break;
        }
      }
    }
  }

  if (!absolute) {
    return trimmed;
  }

  const rel = path.relative(baseDir, absolute).split(path.sep).join('/');
  return rel || './';
}

export function createAdobeMarkdownIt(sourceFsPath: string): MarkdownIt {
  const folders = workspace.workspaceFolders;
  const md = new MarkdownIt('default', {
    html: true,
    linkify: true,
    typographer: true,
  });

  md.use(require('markdown-it-anchor'), {
    /* Match GitHub/EXL-style slugs so (#alert-blocks) resolves to headings. */
    tabIndex: false,
    /* ids only — no ¶ / # permalink next to headings in preview */
    permalink: false,
  });
  md.use(require('markdown-it-replace-link'), {
    replaceLink: (link: string, _env: unknown) =>
      makeRelativeLinkForPreview(link, sourceFsPath, folders),
  });

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /**
   * `[!TAG inner]` (DNL, UICONTROL, and other EXL inline macros): preview shows
   * only the inner string — no macro name, no wrapper. BADGE and `[!TAG]{…}`
   * are excluded (handled elsewhere or not this shape).
   */
  const inlineBracketMacroText =
    /^\[!([A-Z_][A-Z0-9_]*)\s+([^\]]+)\](?!\{)/;
  md.inline.ruler.before('link', 'adobe-inline-bracket-macro-text', function (
    state: any,
    silent: boolean
  ): boolean {
    if (state.src.charCodeAt(state.pos) !== 0x5b /* [ */) {
      return false;
    }
    const m = inlineBracketMacroText.exec(state.src.slice(state.pos));
    if (!m) {
      return false;
    }
    if (m[1] === 'BADGE') {
      return false;
    }
    if (!silent) {
      const token = state.push('html_inline', '', 0);
      token.content = esc(m[2].trim());
    }
    state.pos += m[0].length;
    return true;
  });

  md.inline.ruler.before('link', 'adobe-badge', function (
    state: any,
    silent: boolean
  ): boolean {
    if (state.src.charCodeAt(state.pos) !== 0x5b /* [ */) {
      return false;
    }
    const m = /^\[!BADGE\s+([^\]]+)\](?:\{([^}]*)\})?/.exec(
      state.src.slice(state.pos)
    );
    if (!m) {
      return false;
    }
    if (!silent) {
      const text = m[1].trim();
      const attrs = m[2] || '';
      const typeMatch = /type=(\w+)/i.exec(attrs);
      const badgeType = (typeMatch ? typeMatch[1] : 'Informative').toLowerCase();
      const typeClass: { [k: string]: string } = {
        informative: 'badge-informative',
        positive: 'badge-positive',
        negative: 'badge-negative',
        neutral: 'badge-neutral',
        caution: 'badge-caution',
      };
      const cls = typeClass[badgeType] || 'badge-informative';
      const urlMatch = /url="([^"]*)"/.exec(attrs);
      const tooltipMatch = /tooltip="([^"]*)"/.exec(attrs);
      const url = urlMatch ? urlMatch[1] : '';
      const tooltip = tooltipMatch ? tooltipMatch[1] : '';
      const tipAttr = tooltip ? ` title="${esc(tooltip)}"` : '';
      const safeText = esc(text);
      let html: string;
      if (url) {
        html = `<a href="${esc(url)}" class="exl-badge ${cls}"${tipAttr}>${safeText}</a>`;
      } else {
        html = `<span class="exl-badge ${cls}"${tipAttr}>${safeText}</span>`;
      }
      const token = state.push('html_inline', '', 0);
      token.content = html;
    }
    state.pos += m[0].length;
    return true;
  });

  md.inline.ruler.push('adobe-strip-attr-block', function (
    state: any,
    silent: boolean
  ): boolean {
    if (state.src.charCodeAt(state.pos) !== 0x7b /* { */) {
      return false;
    }
    const m = /^\{[^}\n]+\}/.exec(state.src.slice(state.pos));
    if (!m) {
      return false;
    }
    if (!silent) {
      state.push('html_inline', '', 0).content = '';
    }
    state.pos += m[0].length;
    return true;
  });

  const alertTypes: { [key: string]: { cls: string; label: string } } = {
    NOTE: { cls: 'note', label: 'NOTE' },
    TIP: { cls: 'tip', label: 'TIP' },
    IMPORTANT: { cls: 'important', label: 'IMPORTANT' },
    WARNING: { cls: 'warning', label: 'WARNING' },
    CAUTION: { cls: 'caution', label: 'CAUTION' },
    ADMIN: { cls: 'admin', label: 'ADMIN' },
    ADMINISTRATION: { cls: 'administration', label: 'ADMIN' },
    AVAILABILITY: { cls: 'availability', label: 'AVAILABILITY' },
    PREREQUISITES: { cls: 'prerequisites', label: 'PREREQUISITES' },
    INFO: { cls: 'info', label: 'INFO' },
    ERROR: { cls: 'error', label: 'ERROR' },
    SUCCESS: { cls: 'success', label: 'SUCCESS' },
    MORELIKETHIS: { cls: 'morelikethis', label: 'More like this' },
  };
  const contextualHelpMarker = /^\[!CONTEXTUALHELP\]\s*$/i;
  const contextualHelpAttrLine =
    /^[a-z][\w-]*(?:="[^"]*")(?:\s+[a-z][\w-]*="[^"]*")*\s*$/i;

  const isContextualHelpBlock = (
    tokens: any[],
    openIdx: number,
    closeIdx: number
  ): boolean => {
    const lines: string[] = [];
    for (let j = openIdx + 1; j < closeIdx; j++) {
      if (tokens[j].type !== 'inline') {
        continue;
      }
      lines.push(
        ...tokens[j].content
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter(Boolean)
      );
    }
    if (!lines.length || !contextualHelpMarker.test(lines[0])) {
      return false;
    }
    return lines.slice(1).every((line) => contextualHelpAttrLine.test(line));
  };

  md.core.ruler.push('adobe-alerts', function (state) {
    const tokens = state.tokens;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i].type !== 'blockquote_open') {
        continue;
      }

      let closeIdx = -1;
      let depth = 0;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'blockquote_open') {
          depth++;
          continue;
        }
        if (tokens[j].type === 'blockquote_close') {
          if (depth === 0) {
            closeIdx = j;
            break;
          }
          depth--;
        }
      }
      if (closeIdx < 0) {
        continue;
      }

      let firstInlineIdx = -1;
      let typeParaOpen = -1;
      let typeParaClose = -1;
      for (let j = i + 1; j < closeIdx; j++) {
        if (tokens[j].type !== 'inline') {
          continue;
        }
        firstInlineIdx = j;
        if (tokens[j - 1]?.type === 'paragraph_open') {
          typeParaOpen = j - 1;
        }
        if (tokens[j + 1]?.type === 'paragraph_close') {
          typeParaClose = j + 1;
        }
        break;
      }
      if (firstInlineIdx < 0) {
        continue;
      }

      const raw = tokens[firstInlineIdx].content.trim();

      if (isContextualHelpBlock(tokens, i, closeIdx)) {
        tokens.splice(i, closeIdx - i + 1);
        continue;
      }

      const apply = (openHtml: string, closeHtml: string) => {
        tokens[closeIdx].type = 'html_block';
        tokens[closeIdx].content = closeHtml;
        tokens[closeIdx].tag = '';
        if (typeParaOpen >= 0 && typeParaClose >= 0) {
          tokens.splice(typeParaOpen, typeParaClose - typeParaOpen + 1);
        }
        tokens[i].type = 'html_block';
        tokens[i].content = openHtml;
        tokens[i].tag = '';
      };

      let m: RegExpExecArray | null;
      m = /^\[!([\w]+)\]\s*$/.exec(raw);
      if (m && alertTypes[m[1]]) {
        const at = alertTypes[m[1]];
        apply(
          `<div class="extension ${at.cls}" data-label="${at.label}">`,
          '</div>'
        );
        continue;
      }

      m = /^\[!BEGINSHADEBOX(?:\s+"([^"]*)")?\]\s*$/.exec(raw);
      if (m) {
        const title = m[1];
        const titleHtml = title
          ? `<p class="shadebox-title">${esc(title)}</p>\n`
          : '';
        apply(`<div class="shadebox">\n${titleHtml}`, '');
        continue;
      }

      if (/^\[!ENDSHADEBOX\]\s*$/.test(raw)) {
        apply('', '</div>\n');
        continue;
      }

      if (/^\[!BEGINTABS\]\s*$/.test(raw)) {
        apply('<div class="exl-tabs">\n', '');
        continue;
      }

      m = /^\[!TAB\s+([^\]]+)\]\s*$/.exec(raw);
      if (m) {
        apply(
          `<div class="exl-tab-start" data-title="${esc(m[1].trim())}"></div>\n`,
          ''
        );
        continue;
      }

      if (/^\[!ENDTABS\]\s*$/.test(raw)) {
        apply('<div class="exl-tab-end"></div>\n', '</div>\n');
        continue;
      }

      m = /^\[!VIDEO\]\(([^)]+)\)\s*$/.exec(raw);
      if (m) {
        const url = m[1].replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        apply(
          `<div class="exl-video"><a class="exl-video-link" href="${url}" target="_blank">▶ Watch video</a></div>\n`,
          ''
        );
        continue;
      }
    }
  });

  md.block.ruler.before(
    'fence',
    'collapsible',
    (state: any, startLine: number, endLine: number, silent: boolean): boolean => {
      const pos = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      const lineText = state.src.slice(pos, max).trim();

      if (!lineText.startsWith('+++')) {
        return false;
      }
      const title = lineText.slice(3).trim();
      if (!title) {
        return false;
      }

      let closeIdx = -1;
      for (let i = startLine + 1; i < endLine; i++) {
        const p = state.bMarks[i] + state.tShift[i];
        const m = state.eMarks[i];
        if (state.src.slice(p, m).trim() === '+++') {
          closeIdx = i;
          break;
        }
      }
      if (closeIdx < 0) {
        return false;
      }

      if (silent) {
        return true;
      }

      const safeTitle = title
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      let token = state.push('html_block', '', 0);
      token.content = `<details>\n<summary>${safeTitle}</summary>\n`;
      token.map = [startLine, startLine + 1];

      const oldParent = state.parentType;
      const oldLineMax = state.lineMax;
      state.parentType = 'container';
      state.lineMax = closeIdx;

      state.md.block.tokenize(state, startLine + 1, closeIdx);

      state.parentType = oldParent;
      state.lineMax = oldLineMax;

      token = state.push('html_block', '', 0);
      token.content = '</details>\n';
      token.map = [closeIdx, closeIdx + 1];

      state.line = closeIdx + 1;
      return true;
    },
    { alt: ['paragraph', 'reference'] }
  );

  /**
   * EXL image attributes: `![](path.png){width="800" zoomable="yes"}`
   * markdown-it leaves `{...}` as a trailing text token; merge into <img> attrs.
   */
  const mergeExlImageBraceAttrs = (state: any) => {
    const braceTail = /^\{([^}]*)\}\s*$/;
    const attrDouble = /([a-zA-Z][\w-]*)\s*=\s*"([^"]*)"/g;
    const attrSingle = /([a-zA-Z][\w-]*)\s*=\s*'([^']*)'/g;

    const applyAttrs = (img: any, inner: string) => {
      const pairs: [string, string][] = [];
      let m: RegExpExecArray | null;
      while ((m = attrDouble.exec(inner)) !== null) {
        pairs.push([m[1], m[2]]);
      }
      while ((m = attrSingle.exec(inner)) !== null) {
        pairs.push([m[1], m[2]]);
      }
      for (const [rawKey, val] of pairs) {
        const key = rawKey.toLowerCase();
        if (key === 'zoomable') {
          img.attrSet('data-zoomable', val);
        } else {
          img.attrSet(key, val);
        }
      }
    };

    const mergeInInlines = (children: any[]) => {
      if (!children?.length) {
        return;
      }
      for (let i = 0; i < children.length - 1; i++) {
        const cur = children[i];
        const next = children[i + 1];
        if (cur.type === 'image' && next.type === 'text') {
          const tm = braceTail.exec(next.content.trim());
          if (tm) {
            applyAttrs(cur, tm[1]);
            children.splice(i + 1, 1);
            i--;
          }
        }
      }
      for (const c of children) {
        if (c.children?.length) {
          mergeInInlines(c.children);
        }
      }
    };

    for (const t of state.tokens) {
      if (t.type === 'inline' && t.children?.length) {
        mergeInInlines(t.children);
      }
    }
  };

  md.core.ruler.after('text_join', 'exl-image-brace-attrs', mergeExlImageBraceAttrs);

  md.core.ruler.push('strip_attr_blocks', (state: any) => {
    const tokens = state.tokens;
    for (let i = tokens.length - 3; i >= 0; i--) {
      if (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 2].type === 'paragraph_close' &&
        /^\{[^}]*\}\s*$/.test(tokens[i + 1].content.trim())
      ) {
        tokens.splice(i, 3);
      }
    }
  });

  return md;
}
