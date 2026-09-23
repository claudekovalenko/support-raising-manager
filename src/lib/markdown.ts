// A tiny, safe Markdown subset for update posts:
// ## headings, - bullets, **bold**, *italic*, [links](https://...), blank-line paragraphs.
// All input is HTML-escaped first, so nothing a writer types can inject markup.

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export function renderMarkdown(src: string) {
  const blocks = src.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const heading = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
      if (heading && lines.length === 1) {
        const level = Math.min(heading[1].length + 1, 4);
        return `<h${level}>${inline(heading[2])}</h${level}>`;
      }
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      if (heading) {
        const level = Math.min(heading[1].length + 1, 4);
        return `<h${level}>${inline(heading[2])}</h${level}><p>${lines.slice(1).map(inline).join("<br>")}</p>`;
      }
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("\n");
}

/** Plain-text version for SMS / Signal: strips markdown syntax. */
export function markdownToText(src: string) {
  return src
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,3}\s+(.*)$/gm, (_, t: string) => t.toUpperCase())
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}
