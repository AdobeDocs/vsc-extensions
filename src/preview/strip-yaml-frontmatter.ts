/**
 * Remove YAML front matter (--- … ---) from the start of markdown before preview.
 * Supports consecutive blocks (e.g. test meta + content frontmatter) the same way
 * lint rules treat multiple leading delimited sections.
 */
export function stripYamlFrontmatterForPreview(source: string): string {
  let text = source.replace(/^\uFEFF/, '');

  while (text.length > 0) {
    const lines = text.split(/\r?\n/);
    let i = 0;
    while (i < lines.length && lines[i].trim() === '') {
      i++;
    }
    if (i >= lines.length || lines[i].trim() !== '---') {
      break;
    }
    let j = i + 1;
    let close = -1;
    while (j < lines.length) {
      if (lines[j].trim() === '---') {
        close = j;
        break;
      }
      j++;
    }
    if (close < 0) {
      break;
    }
    const rest = lines.slice(close + 1).join('\n');
    text = rest.replace(/^\r?\n+/, '');
  }

  return text;
}
