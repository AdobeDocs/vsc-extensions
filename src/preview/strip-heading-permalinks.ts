/**
 * Remove visible permalink &lt;a&gt; nodes that markdown-it-anchor or host styles
 * may still emit (e.g. .header-anchor, GitHub-style .anchor with aria-hidden).
 */
export function stripHeadingPermalinkAnchors(html: string): string {
  let out = html;
  /* markdown-it-anchor / common class names */
  out = out.replace(
    /<a\b[^>]*\bclass="[^"]*\bheader-anchor\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    ''
  );
  /* GitHub-style hidden permalink */
  out = out.replace(
    /<a\b[^>]*\bclass="[^"]*\banchor\b[^"]*"[^>]*\baria-hidden="true"[^>]*>[\s\S]*?<\/a>/gi,
    ''
  );
  out = out.replace(
    /<a\b[^>]*\baria-hidden="true"[^>]*\bclass="[^"]*\banchor\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    ''
  );
  return out;
}
